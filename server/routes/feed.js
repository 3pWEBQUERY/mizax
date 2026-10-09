import express from 'express';
import { query } from '../db.js';
import { hasStorage } from '../storage.js';
import { httpError, requireUser, requireEscort, rateLimit } from '../auth.js';
import { wrap, requireDb, noStore, text, toId, uploadImages } from '../http.js';
import { storeImage, removeImages, photoOut, isImage } from '../media.js';
import { THUMB, thumbUrl, ownEscort } from '../escorts.js';

// Feed der Escorts: Beiträge, Fotos, Likes und Kommentare

const MAX_POST_PHOTOS = 6;

const router = express.Router();

// ---------- Feed ----------

export async function loadPosts(me, { where = [], params = [], before = null, limit = 10 } = {}) {
  const args = [me.id, ...params];
  const conds = ['(e.published = true OR e.user_id = $1)', ...where];
  if (before) {
    args.push(before);
    conds.push(`p.id < $${args.length}`);
  }
  args.push(limit);
  const { rows } = await query(
    `SELECT p.id, p.body, p.created_at, p.updated_at, p.escort_id,
       e.slug, e.name, e.verified, e.accent, e.user_id AS owner_id, ${THUMB('e')} AS thumb_key,
       (SELECT count(*) FROM post_likes WHERE post_id = p.id)::int AS likes,
       (SELECT count(*) FROM post_comments WHERE post_id = p.id)::int AS comments,
       EXISTS (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) AS liked
     FROM posts p JOIN escorts e ON e.id = p.escort_id
     WHERE ${conds.join(' AND ')}
     ORDER BY p.id DESC LIMIT $${args.length}`,
    args,
  );
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [{ rows: photos }, { rows: comments }] = await Promise.all([
    query('SELECT * FROM post_photos WHERE post_id = ANY($1) ORDER BY position, id', [ids]),
    query(
      `SELECT * FROM (
         SELECT k.*, row_number() OVER (PARTITION BY k.post_id ORDER BY k.id DESC) AS rn
         FROM post_comments k WHERE k.post_id = ANY($1)
       ) k WHERE rn <= 2`,
      [ids],
    ),
  ]);
  const authors = await commentAuthors(comments.map((c) => c.user_id));
  const owners = new Map(rows.map((r) => [r.id, r.owner_id]));
  return rows.map((r) =>
    postOut(
      r,
      photos.filter((p) => p.post_id === r.id),
      comments
        .filter((c) => c.post_id === r.id)
        .sort((a, b) => a.id - b.id)
        .map((c) => commentOut(c, authors, me, owners.get(c.post_id))),
      me,
    ),
  );
}

function postOut(r, photos, comments, me) {
  const mine = r.owner_id === me.id;
  return {
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    edited: new Date(r.updated_at) - new Date(r.created_at) > 2000,
    author: {
      slug: r.slug,
      name: r.name,
      verified: r.verified,
      accent: r.accent,
      thumb: thumbUrl(r.thumb_key),
    },
    photos: photos.map(photoOut),
    likes: r.likes,
    liked: r.liked,
    commentsCount: r.comments,
    comments,
    mine,
    canDelete: mine || Boolean(me.is_admin),
  };
}

async function commentAuthors(userIds) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return new Map();
  const { rows } = await query(
    `SELECT u.id, u.name, u.role, e.slug, e.name AS escort_name, ${THUMB('e')} AS thumb_key
     FROM users u LEFT JOIN escorts e ON e.user_id = u.id AND e.published = true
     WHERE u.id = ANY($1)`,
    [ids],
  );
  return new Map(rows.map((r) => [r.id, r]));
}

function commentOut(c, authors, me, postOwnerId) {
  const a = authors.get(c.user_id);
  return {
    id: c.id,
    body: c.body,
    at: c.created_at,
    author: a?.slug
      ? {
          kind: 'escort',
          name: a.escort_name,
          slug: a.slug,
          thumb: thumbUrl(a.thumb_key),
        }
      : { kind: 'member', name: a?.name || '–', memberId: c.user_id },
    mine: c.user_id === me.id,
    canDelete: c.user_id === me.id || postOwnerId === me.id || Boolean(me.is_admin),
  };
}

async function visiblePost(postId, me) {
  const { rows } = await query(
    `SELECT p.id, p.escort_id, e.user_id AS owner_id, e.published
     FROM posts p JOIN escorts e ON e.id = p.escort_id WHERE p.id = $1`,
    [postId],
  );
  const p = rows[0];
  if (!p || (!p.published && p.owner_id !== me.id && !me.is_admin)) throw httpError(404, 'not_found', 'Nicht gefunden');
  return p;
}

async function onePost(postId, me) {
  const [post] = await loadPosts(me, {
    where: ['p.id = $2'],
    params: [postId],
    limit: 1,
  });
  if (!post) throw httpError(404, 'not_found', 'Nicht gefunden');
  return post;
}

// ---------- Routen ----------

// --- Feed ---

router.get(
  '/api/feed',
  requireUser,
  wrap(async (req, res) => {
    const where = [];
    if (req.query.scope === 'favorites') {
      where.push('p.escort_id IN (SELECT escort_id FROM favorites WHERE user_id = $1)');
    }
    const before = Number(req.query.before) || null;
    noStore(res);
    res.json(await loadPosts(req.user, { where, before, limit: 10 }));
  }),
);

router.get(
  '/api/escorts/:slug/posts',
  requireUser,
  wrap(async (req, res) => {
    const before = Number(req.query.before) || null;
    noStore(res);
    res.json(
      await loadPosts(req.user, {
        where: ['e.slug = $2'],
        params: [req.params.slug],
        before,
        limit: 10,
      }),
    );
  }),
);

router.post(
  '/api/me/posts',
  requireEscort,
  requireDb,
  rateLimit(40, 60 * 60 * 1000),
  uploadImages(MAX_POST_PHOTOS),
  wrap(async (req, res) => {
    const escort = await ownEscort(req.user.id);
    if (!escort) throw httpError(404, 'profile_missing', 'Bitte speichere zuerst dein Profil');
    const body = text(req.body?.body, 5000);
    const files = (req.files || []).filter(isImage);
    if (!body && !files.length) throw httpError(400, 'post_empty', 'Beitrag ist leer');
    if (files.length && !hasStorage()) throw httpError(503, 'storage_unavailable', 'Bucket nicht verbunden');
    const { rows } = await query('INSERT INTO posts (escort_id, body) VALUES ($1, $2) RETURNING id', [escort.id, body]);
    const postId = rows[0].id;
    try {
      let position = 0;
      for (const file of files) {
        const img = await storeImage(file, `posts/${escort.id}`);
        await query('INSERT INTO post_photos (post_id, key, width, height, position) VALUES ($1,$2,$3,$4,$5)', [
          postId,
          img.key,
          img.width,
          img.height,
          position++,
        ]);
      }
    } catch (err) {
      await deletePost(postId);
      throw err;
    }
    res.status(201).json(await onePost(postId, req.user));
  }),
);

router.put(
  '/api/posts/:id',
  requireUser,
  wrap(async (req, res) => {
    const post = await visiblePost(toId(req.params.id), req.user);
    if (post.owner_id !== req.user.id) throw httpError(403, 'forbidden', 'Keine Berechtigung');
    const body = text(req.body?.body, 5000);
    const { rows } = await query('SELECT count(*)::int AS n FROM post_photos WHERE post_id = $1', [post.id]);
    if (!body && !rows[0].n) throw httpError(400, 'post_empty', 'Beitrag ist leer');
    await query('UPDATE posts SET body = $1, updated_at = now() WHERE id = $2', [body, post.id]);
    res.json(await onePost(post.id, req.user));
  }),
);

async function deletePost(postId) {
  const { rows } = await query('SELECT key FROM post_photos WHERE post_id = $1', [postId]);
  await query('DELETE FROM posts WHERE id = $1', [postId]);
  await removeImages(rows.map((r) => r.key));
}

router.delete(
  '/api/posts/:id',
  requireUser,
  wrap(async (req, res) => {
    const post = await visiblePost(toId(req.params.id), req.user);
    if (post.owner_id !== req.user.id && !req.user.is_admin) throw httpError(403, 'forbidden', 'Keine Berechtigung');
    await deletePost(post.id);
    res.json({ ok: true });
  }),
);

router.post(
  '/api/posts/:id/like',
  requireUser,
  wrap(async (req, res) => {
    const post = await visiblePost(toId(req.params.id), req.user);
    const { rowCount } = await query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [
      post.id,
      req.user.id,
    ]);
    if (!rowCount) {
      await query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
        post.id,
        req.user.id,
      ]);
    }
    const { rows } = await query('SELECT count(*)::int AS n FROM post_likes WHERE post_id = $1', [post.id]);
    res.json({ liked: !rowCount, likes: rows[0].n });
  }),
);

router.get(
  '/api/posts/:id/comments',
  requireUser,
  wrap(async (req, res) => {
    const post = await visiblePost(toId(req.params.id), req.user);
    const { rows } = await query('SELECT * FROM post_comments WHERE post_id = $1 ORDER BY id LIMIT 500', [post.id]);
    const authors = await commentAuthors(rows.map((c) => c.user_id));
    noStore(res);
    res.json(rows.map((c) => commentOut(c, authors, req.user, post.owner_id)));
  }),
);

router.post(
  '/api/posts/:id/comments',
  requireUser,
  rateLimit(120, 10 * 60 * 1000),
  wrap(async (req, res) => {
    const post = await visiblePost(toId(req.params.id), req.user);
    const body = text(req.body?.body, 1000);
    if (!body) throw httpError(400, 'message_empty', 'Kommentar ist leer');
    const { rows } = await query('INSERT INTO post_comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING *', [
      post.id,
      req.user.id,
      body,
    ]);
    const authors = await commentAuthors([req.user.id]);
    res.status(201).json(commentOut(rows[0], authors, req.user, post.owner_id));
  }),
);

router.delete(
  '/api/comments/:id',
  requireUser,
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT k.id, k.user_id, e.user_id AS owner_id FROM post_comments k
       JOIN posts p ON p.id = k.post_id JOIN escorts e ON e.id = p.escort_id WHERE k.id = $1`,
      [toId(req.params.id)],
    );
    const c = rows[0];
    if (!c) throw httpError(404, 'not_found', 'Nicht gefunden');
    if (c.user_id !== req.user.id && c.owner_id !== req.user.id && !req.user.is_admin) {
      throw httpError(403, 'forbidden', 'Keine Berechtigung');
    }
    await query('DELETE FROM post_comments WHERE id = $1', [c.id]);
    res.json({ ok: true });
  }),
);

export default router;
