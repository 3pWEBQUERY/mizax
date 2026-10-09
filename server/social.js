import crypto from 'node:crypto';
import fs from 'node:fs';
import { query } from './db.js';
import { hasStorage } from './storage.js';
import { storeImage, removeImages, photoOut, isImage } from './media.js';
import {
  SECRET,
  httpError,
  requireUser,
  requireEscort,
  rateLimit,
  verifyPassword,
  hashPassword,
  clearSession,
  userOut,
  showsVisits,
} from './auth.js';

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const TZ = 'Europe/Zurich';
const MAX_POST_PHOTOS = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless/i;
const text = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const id = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw httpError(404, 'not_found', 'Nicht gefunden');
  return n;
};

// erstes Foto eines Escort-Profils als Vorschaubild
const THUMB = (alias) =>
  `(SELECT key FROM escort_photos WHERE escort_id = ${alias}.id ORDER BY position, id LIMIT 1)`;
const thumbUrl = (key) => (key ? `/media/${key}_sm.webp` : null);

function noStore(res) {
  res.set('Cache-Control', 'private, no-store');
}

async function ownEscort(userId) {
  const { rows } = await query('SELECT id, slug, name, published FROM escorts WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

// ---------- Profilaufrufe ----------

// Gäste werden nur über einen täglich wechselnden, nicht umkehrbaren Schlüssel gezählt –
// IP-Adresse und Browserkennung selbst werden nicht gespeichert.
function guestKey(req) {
  const day = new Date().toISOString().slice(0, 10);
  const hash = crypto
    .createHmac('sha256', SECRET)
    .update(`${day}|${req.ip}|${req.get('user-agent') || ''}`)
    .digest('base64url');
  return `g:${hash.slice(0, 22)}`;
}

async function recordEscortView(req, slug) {
  const { rows } = await query('SELECT id, user_id FROM escorts WHERE slug = $1 AND published = true', [slug]);
  const escort = rows[0];
  if (!escort) throw httpError(404, 'not_found', 'Profil nicht gefunden');
  if (BOT_RE.test(req.get('user-agent') || '')) return;
  if (req.user && escort.user_id === req.user.id) return; // eigenes Profil zählt nicht
  const key = req.user ? `u:${req.user.id}` : guestKey(req);
  // derselbe Besucher zählt höchstens einmal pro 30 Minuten
  await query(
    `INSERT INTO profile_views (escort_id, viewer_id, viewer_key)
     SELECT $1, $2, $3
     WHERE NOT EXISTS (
       SELECT 1 FROM profile_views
       WHERE escort_id = $1 AND viewer_key = $3 AND created_at > now() - interval '30 minutes'
     )`,
    [escort.id, req.user?.id || null, key],
  );
}

// ---------- Statistik ----------

const RANGE = `
  WITH r AS (
    SELECT ((now() AT TIME ZONE '${TZ}')::date - ($2::int - 1))::timestamp AT TIME ZONE '${TZ}' AS since
  )`;

async function dailySeries(table, column, ownerId, days, extra = '') {
  const { rows } = await query(
    `SELECT to_char(d, 'YYYY-MM-DD') AS day, count(v.id)::int AS n
     FROM generate_series(
       (now() AT TIME ZONE '${TZ}')::date - ($2::int - 1),
       (now() AT TIME ZONE '${TZ}')::date,
       interval '1 day'
     ) d
     LEFT JOIN ${table} v
       ON v.${column} = $1 ${extra} AND (v.created_at AT TIME ZONE '${TZ}')::date = d::date
     GROUP BY d ORDER BY d`,
    [ownerId, days],
  );
  return rows.map((r) => ({ day: r.day, value: r.n }));
}

async function escortStats(user, escort, days) {
  const { rows } = await query(
    `${RANGE}
     SELECT
       (SELECT count(*) FROM profile_views, r WHERE escort_id = $1 AND created_at >= r.since)::int AS views,
       (SELECT count(*) FROM profile_views, r
         WHERE escort_id = $1 AND created_at >= r.since - make_interval(days => $2) AND created_at < r.since)::int AS prev_views,
       (SELECT count(DISTINCT viewer_key) FROM profile_views, r WHERE escort_id = $1 AND created_at >= r.since)::int AS visitors,
       (SELECT count(DISTINCT viewer_key) FROM profile_views, r WHERE escort_id = $1 AND viewer_id IS NOT NULL AND created_at >= r.since)::int AS member_visitors,
       (SELECT count(*) FROM profile_views
         WHERE escort_id = $1 AND created_at >= (now() AT TIME ZONE '${TZ}')::date::timestamp AT TIME ZONE '${TZ}')::int AS today,
       (SELECT count(*) FROM favorites WHERE escort_id = $1)::int AS favorites,
       (SELECT count(*) FROM favorites, r WHERE escort_id = $1 AND created_at >= r.since)::int AS new_favorites,
       (SELECT count(*) FROM conversations WHERE escort_id = $1)::int AS conversations,
       (SELECT count(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id, r
         WHERE c.escort_id = $1 AND m.sender_id IS DISTINCT FROM $3 AND m.created_at >= r.since)::int AS messages,
       (SELECT count(*) FROM posts WHERE escort_id = $1)::int AS posts,
       (SELECT count(*) FROM post_likes l JOIN posts p ON p.id = l.post_id, r
         WHERE p.escort_id = $1 AND l.created_at >= r.since)::int AS likes,
       (SELECT count(*) FROM post_comments k JOIN posts p ON p.id = k.post_id, r
         WHERE p.escort_id = $1 AND k.created_at >= r.since)::int AS comments`,
    [escort.id, days, user.id],
  );
  const t = rows[0];

  const { rows: visitors } = await query(
    `${RANGE}
     SELECT * FROM (
       SELECT DISTINCT ON (v.viewer_key)
         v.viewer_key, v.viewer_id, v.created_at,
         count(*) OVER (PARTITION BY v.viewer_key)::int AS visits,
         u.name, u.role, u.show_visits, ve.slug, ve.name AS escort_name, ${THUMB('ve')} AS thumb_key
       FROM profile_views v CROSS JOIN r
       LEFT JOIN users u ON u.id = v.viewer_id
       LEFT JOIN escorts ve ON ve.user_id = u.id AND ve.published = true
       WHERE v.escort_id = $1 AND v.created_at >= r.since
       ORDER BY v.viewer_key, v.created_at DESC
     ) x ORDER BY created_at DESC LIMIT 24`,
    [escort.id, days],
  );

  return {
    role: 'escort',
    days,
    profile: { slug: escort.slug, name: escort.name, published: escort.published },
    totals: {
      views: t.views,
      prevViews: t.prev_views,
      visitors: t.visitors,
      memberVisitors: t.member_visitors,
      guestVisitors: t.visitors - t.member_visitors,
      today: t.today,
      favorites: t.favorites,
      newFavorites: t.new_favorites,
      conversations: t.conversations,
      messages: t.messages,
      posts: t.posts,
      likes: t.likes,
      comments: t.comments,
    },
    series: await dailySeries('profile_views', 'escort_id', escort.id, days),
    visitors: visitors.map((v) => {
      const at = v.created_at;
      if (!v.viewer_id) return { kind: 'guest', at, visits: v.visits };
      if (!v.name || !showsVisits(v)) return { kind: 'hidden', at, visits: v.visits };
      if (v.slug) {
        return { kind: 'escort', at, visits: v.visits, name: v.escort_name, slug: v.slug, thumb: thumbUrl(v.thumb_key) };
      }
      return { kind: 'member', at, visits: v.visits, name: v.name, memberId: v.viewer_id };
    }),
  };
}

async function memberStats(user, days) {
  const { rows } = await query(
    `${RANGE}
     SELECT
       (SELECT count(*) FROM member_views, r WHERE member_id = $1 AND created_at >= r.since)::int AS visits,
       (SELECT count(*) FROM member_views, r
         WHERE member_id = $1 AND created_at >= r.since - make_interval(days => $2) AND created_at < r.since)::int AS prev_visits,
       (SELECT count(DISTINCT viewer_id) FROM member_views, r WHERE member_id = $1 AND created_at >= r.since)::int AS visitors,
       (SELECT count(*) FROM favorites WHERE user_id = $1)::int AS favorites,
       (SELECT count(DISTINCT escort_id) FROM profile_views, r WHERE viewer_id = $1 AND created_at >= r.since)::int AS viewed,
       (SELECT count(*) FROM conversations WHERE user_id = $1)::int AS conversations,
       (SELECT count(*) FROM messages, r WHERE sender_id = $1 AND created_at >= r.since)::int AS messages,
       (SELECT count(*) FROM post_likes, r WHERE user_id = $1 AND created_at >= r.since)::int AS likes,
       (SELECT count(*) FROM post_comments, r WHERE user_id = $1 AND created_at >= r.since)::int AS comments`,
    [user.id, days],
  );
  const t = rows[0];

  const { rows: visitors } = await query(
    `${RANGE}
     SELECT * FROM (
       SELECT DISTINCT ON (v.viewer_id)
         v.viewer_id, v.created_at, count(*) OVER (PARTITION BY v.viewer_id)::int AS visits,
         u.name, u.role, u.show_visits, e.slug, e.name AS escort_name, ${THUMB('e')} AS thumb_key
       FROM member_views v CROSS JOIN r
       JOIN users u ON u.id = v.viewer_id
       LEFT JOIN escorts e ON e.user_id = u.id AND e.published = true
       WHERE v.member_id = $1 AND v.created_at >= r.since
       ORDER BY v.viewer_id, v.created_at DESC
     ) x ORDER BY created_at DESC LIMIT 24`,
    [user.id, days],
  );

  const { rows: viewed } = await query(
    `SELECT * FROM (
       SELECT DISTINCT ON (v.escort_id) v.escort_id, v.created_at, e.slug, e.name, e.age, e.city, ${THUMB('e')} AS thumb_key
       FROM profile_views v JOIN escorts e ON e.id = v.escort_id AND e.published = true
       WHERE v.viewer_id = $1
       ORDER BY v.escort_id, v.created_at DESC
     ) x ORDER BY created_at DESC LIMIT 12`,
    [user.id],
  );

  return {
    role: 'member',
    days,
    totals: {
      visits: t.visits,
      prevVisits: t.prev_visits,
      visitors: t.visitors,
      favorites: t.favorites,
      viewed: t.viewed,
      conversations: t.conversations,
      messages: t.messages,
      likes: t.likes,
      comments: t.comments,
    },
    series: await dailySeries('member_views', 'member_id', user.id, days),
    visitors: visitors.map((v) => {
      const at = v.created_at;
      if (!showsVisits(v)) return { kind: 'hidden', at, visits: v.visits };
      if (v.slug) {
        return { kind: 'escort', at, visits: v.visits, name: v.escort_name, slug: v.slug, thumb: thumbUrl(v.thumb_key) };
      }
      return { kind: 'member', at, visits: v.visits, name: v.name, memberId: v.viewer_id };
    }),
    viewed: viewed.map((v) => ({
      slug: v.slug,
      name: v.name,
      age: v.age,
      city: v.city,
      thumb: thumbUrl(v.thumb_key),
      at: v.created_at,
    })),
  };
}

async function buildStats(user, days) {
  if (user.role === 'escort') {
    const escort = await ownEscort(user.id);
    if (!escort) return { role: 'escort', days, profile: null };
    return escortStats(user, escort, days);
  }
  return memberStats(user, days);
}

// ---------- Nachrichten ----------

const CONV_SELECT = `
  SELECT c.id, c.user_id, c.escort_id, c.created_at, c.last_message_at,
    e.user_id AS escort_user_id, e.slug, e.name AS escort_name, e.accent, e.verified, ${THUMB('e')} AS thumb_key,
    u.name AS user_name, u.role AS user_role
  FROM conversations c
  JOIN escorts e ON e.id = c.escort_id
  JOIN users u ON u.id = c.user_id`;

function convOut(row, me) {
  const isClient = row.user_id === me;
  return {
    id: row.id,
    side: isClient ? 'client' : 'escort',
    other: isClient
      ? {
          kind: 'escort',
          name: row.escort_name,
          slug: row.slug,
          thumb: thumbUrl(row.thumb_key),
          accent: row.accent,
          verified: row.verified,
        }
      : { kind: 'member', name: row.user_name, memberId: row.user_id },
    last: row.last_at ? { body: row.last_body, at: row.last_at, mine: row.last_sender === me } : null,
    unread: row.unread || 0,
    lastMessageAt: row.last_message_at,
  };
}

async function listConversations(me, limit = 100) {
  const { rows } = await query(
    `SELECT x.*, lm.body AS last_body, lm.sender_id AS last_sender, lm.created_at AS last_at,
       (SELECT count(*) FROM messages m
         WHERE m.conversation_id = x.id AND m.read_at IS NULL AND m.sender_id IS DISTINCT FROM $1)::int AS unread
     FROM (${CONV_SELECT} WHERE c.user_id = $1 OR e.user_id = $1) x
     LEFT JOIN LATERAL (
       SELECT body, sender_id, created_at FROM messages WHERE conversation_id = x.id ORDER BY id DESC LIMIT 1
     ) lm ON true
     ORDER BY x.last_message_at DESC LIMIT $2`,
    [me, limit],
  );
  return rows.map((r) => convOut(r, me));
}

async function unreadCount(me) {
  const { rows } = await query(
    `SELECT count(*)::int AS n FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     JOIN escorts e ON e.id = c.escort_id
     WHERE (c.user_id = $1 OR e.user_id = $1) AND m.read_at IS NULL AND m.sender_id IS DISTINCT FROM $1`,
    [me],
  );
  return rows[0].n;
}

async function loadConversation(convId, me) {
  const { rows } = await query(`${CONV_SELECT} WHERE c.id = $1`, [convId]);
  const c = rows[0];
  if (!c || (c.user_id !== me && c.escort_user_id !== me)) throw httpError(404, 'not_found', 'Nicht gefunden');
  return c;
}

const messageOut = (m, me) => ({
  id: Number(m.id),
  body: m.body,
  at: m.created_at,
  mine: m.sender_id === me,
  read: Boolean(m.read_at),
});

async function addMessage(convId, me, body) {
  const { rows } = await query(
    'INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *',
    [convId, me, body],
  );
  await query('UPDATE conversations SET last_message_at = now() WHERE id = $1', [convId]);
  // wer antwortet, hat die bisherigen Nachrichten gelesen
  await query(
    `UPDATE messages SET read_at = now()
     WHERE conversation_id = $1 AND read_at IS NULL AND sender_id IS DISTINCT FROM $2 AND id < $3`,
    [convId, me, rows[0].id],
  );
  return messageOut(rows[0], me);
}

function messageBody(v) {
  const body = text(v, 2000);
  if (!body) throw httpError(400, 'message_empty', 'Nachricht ist leer');
  return body;
}

// ---------- Feed ----------

async function loadPosts(me, { where = [], params = [], before = null, limit = 10 } = {}) {
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
    author: { slug: r.slug, name: r.name, verified: r.verified, accent: r.accent, thumb: thumbUrl(r.thumb_key) },
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
      ? { kind: 'escort', name: a.escort_name, slug: a.slug, thumb: thumbUrl(a.thumb_key) }
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
  const [post] = await loadPosts(me, { where: ['p.id = $2'], params: [postId], limit: 1 });
  if (!post) throw httpError(404, 'not_found', 'Nicht gefunden');
  return post;
}

// ---------- Routen ----------

export function registerSocial(app, { upload, requireDb }) {
  function uploadPostPhotos(req, res, next) {
    res.on('close', () => {
      for (const f of req.files || []) fs.promises.unlink(f.path).catch(() => {});
    });
    upload.array('photos', MAX_POST_PHOTOS)(req, res, next);
  }

  // --- Profilaufrufe ---

  app.post(
    '/api/escorts/:slug/view',
    requireDb,
    wrap(async (req, res) => {
      await recordEscortView(req, req.params.slug);
      res.json({ ok: true });
    }),
  );

  // --- Mitgliederprofile (sichtbar für Escorts, die Verwaltung und das Mitglied selbst) ---

  app.get(
    '/api/members/:id',
    requireUser,
    wrap(async (req, res) => {
      const memberId = id(req.params.id);
      const self = memberId === req.user.id;
      if (!self && req.user.role !== 'escort' && !req.user.is_admin) throw httpError(403, 'forbidden', 'Keine Berechtigung');
      const { rows } = await query(
        `SELECT u.id, u.name, u.role, u.bio, u.created_at, e.slug
         FROM users u LEFT JOIN escorts e ON e.user_id = u.id WHERE u.id = $1`,
        [memberId],
      );
      const m = rows[0];
      if (!m) throw httpError(404, 'not_found', 'Nicht gefunden');
      let conversationId = null;
      if (!self) {
        const own = await ownEscort(req.user.id);
        if (own) {
          const { rows: c } = await query('SELECT id FROM conversations WHERE user_id = $1 AND escort_id = $2', [
            memberId,
            own.id,
          ]);
          conversationId = c[0]?.id || null;
        }
      }
      noStore(res);
      res.json({
        id: m.id,
        name: m.name,
        role: m.role,
        bio: m.bio,
        createdAt: m.created_at,
        escortSlug: m.slug || null,
        conversationId,
        self,
      });
    }),
  );

  app.post(
    '/api/members/:id/view',
    requireUser,
    wrap(async (req, res) => {
      const memberId = id(req.params.id);
      if (memberId !== req.user.id && req.user.role === 'escort') {
        await query(
          `INSERT INTO member_views (member_id, viewer_id)
           SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM users WHERE id = $1 AND role = 'member')
             AND NOT EXISTS (
               SELECT 1 FROM member_views
               WHERE member_id = $1 AND viewer_id = $2 AND created_at > now() - interval '30 minutes'
             )`,
          [memberId, req.user.id],
        );
      }
      res.json({ ok: true });
    }),
  );

  // --- Statistik & Seitenleiste ---

  app.get(
    '/api/me/stats',
    requireUser,
    wrap(async (req, res) => {
      const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
      noStore(res);
      res.json(await buildStats(req.user, days));
    }),
  );

  app.get(
    '/api/me/overview',
    requireUser,
    wrap(async (req, res) => {
      const me = req.user;
      const [conversations, unread, stats, posts] = await Promise.all([
        listConversations(me.id, 3),
        unreadCount(me.id),
        buildStats(me, 14),
        loadPosts(me, { limit: 2 }),
      ]);
      noStore(res);
      res.json({
        unread,
        conversations,
        stats: { role: stats.role, profile: stats.profile ?? null, totals: stats.totals || null, series: stats.series || [] },
        posts,
      });
    }),
  );

  // --- Nachrichten ---

  app.get(
    '/api/messages',
    requireUser,
    wrap(async (req, res) => {
      noStore(res);
      res.json(await listConversations(req.user.id));
    }),
  );

  app.get(
    '/api/messages/unread',
    requireUser,
    wrap(async (req, res) => {
      noStore(res);
      res.json({ count: await unreadCount(req.user.id) });
    }),
  );

  app.get(
    '/api/messages/:id',
    requireUser,
    wrap(async (req, res) => {
      const me = req.user.id;
      const c = await loadConversation(id(req.params.id), me);
      await query(
        `UPDATE messages SET read_at = now()
         WHERE conversation_id = $1 AND read_at IS NULL AND sender_id IS DISTINCT FROM $2`,
        [c.id, me],
      );
      const after = Number(req.query.after) || 0;
      const { rows } = after
        ? await query('SELECT * FROM messages WHERE conversation_id = $1 AND id > $2 ORDER BY id LIMIT 200', [c.id, after])
        : await query('SELECT * FROM (SELECT * FROM messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT 300) m ORDER BY id', [c.id]);
      // Lesestatus eigener Nachrichten (für die Häkchen)
      const { rows: seen } = await query(
        'SELECT max(id) AS id FROM messages WHERE conversation_id = $1 AND sender_id = $2 AND read_at IS NOT NULL',
        [c.id, me],
      );
      noStore(res);
      res.json({
        conversation: convOut(c, me),
        messages: rows.map((m) => messageOut(m, me)),
        readUpTo: Number(seen[0].id) || 0,
      });
    }),
  );

  app.post(
    '/api/messages/start',
    requireUser,
    requireDb,
    rateLimit(40, 10 * 60 * 1000),
    wrap(async (req, res) => {
      const me = req.user.id;
      const body = messageBody(req.body?.body);
      const { rows } = await query('SELECT id, user_id FROM escorts WHERE slug = $1 AND published = true', [
        String(req.body?.slug || ''),
      ]);
      const escort = rows[0];
      if (!escort) throw httpError(404, 'not_found', 'Profil nicht gefunden');
      if (!escort.user_id) throw httpError(400, 'inbox_unavailable', 'Dieses Profil empfängt keine Nachrichten');
      if (escort.user_id === me) throw httpError(400, 'own_profile', 'Eigenes Profil');
      const { rows: conv } = await query(
        `INSERT INTO conversations (user_id, escort_id) VALUES ($1, $2)
         ON CONFLICT (user_id, escort_id) DO UPDATE SET last_message_at = now() RETURNING id`,
        [me, escort.id],
      );
      const message = await addMessage(conv[0].id, me, body);
      res.status(201).json({ conversationId: conv[0].id, message });
    }),
  );

  app.post(
    '/api/messages/:id',
    requireUser,
    rateLimit(300, 10 * 60 * 1000),
    wrap(async (req, res) => {
      const c = await loadConversation(id(req.params.id), req.user.id);
      res.status(201).json(await addMessage(c.id, req.user.id, messageBody(req.body?.body)));
    }),
  );

  // --- Feed ---

  app.get(
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

  app.get(
    '/api/escorts/:slug/posts',
    requireUser,
    wrap(async (req, res) => {
      const before = Number(req.query.before) || null;
      noStore(res);
      res.json(
        await loadPosts(req.user, { where: ['e.slug = $2'], params: [req.params.slug], before, limit: 10 }),
      );
    }),
  );

  app.post(
    '/api/me/posts',
    requireEscort,
    requireDb,
    rateLimit(40, 60 * 60 * 1000),
    uploadPostPhotos,
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

  app.put(
    '/api/posts/:id',
    requireUser,
    wrap(async (req, res) => {
      const post = await visiblePost(id(req.params.id), req.user);
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

  app.delete(
    '/api/posts/:id',
    requireUser,
    wrap(async (req, res) => {
      const post = await visiblePost(id(req.params.id), req.user);
      if (post.owner_id !== req.user.id && !req.user.is_admin) throw httpError(403, 'forbidden', 'Keine Berechtigung');
      await deletePost(post.id);
      res.json({ ok: true });
    }),
  );

  app.post(
    '/api/posts/:id/like',
    requireUser,
    wrap(async (req, res) => {
      const post = await visiblePost(id(req.params.id), req.user);
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

  app.get(
    '/api/posts/:id/comments',
    requireUser,
    wrap(async (req, res) => {
      const post = await visiblePost(id(req.params.id), req.user);
      const { rows } = await query('SELECT * FROM post_comments WHERE post_id = $1 ORDER BY id LIMIT 500', [post.id]);
      const authors = await commentAuthors(rows.map((c) => c.user_id));
      noStore(res);
      res.json(rows.map((c) => commentOut(c, authors, req.user, post.owner_id)));
    }),
  );

  app.post(
    '/api/posts/:id/comments',
    requireUser,
    rateLimit(120, 10 * 60 * 1000),
    wrap(async (req, res) => {
      const post = await visiblePost(id(req.params.id), req.user);
      const body = text(req.body?.body, 1000);
      if (!body) throw httpError(400, 'message_empty', 'Kommentar ist leer');
      const { rows } = await query(
        'INSERT INTO post_comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING *',
        [post.id, req.user.id, body],
      );
      const authors = await commentAuthors([req.user.id]);
      res.status(201).json(commentOut(rows[0], authors, req.user, post.owner_id));
    }),
  );

  app.delete(
    '/api/comments/:id',
    requireUser,
    wrap(async (req, res) => {
      const { rows } = await query(
        `SELECT k.id, k.user_id, e.user_id AS owner_id FROM post_comments k
         JOIN posts p ON p.id = k.post_id JOIN escorts e ON e.id = p.escort_id WHERE k.id = $1`,
        [id(req.params.id)],
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

  // --- Konto-Einstellungen ---

  async function fullUser(userId) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
    return rows[0];
  }

  async function checkPassword(user, password) {
    if (!(await verifyPassword(String(password || ''), user.password_hash))) {
      throw httpError(400, 'wrong_password', 'Falsches Passwort');
    }
  }

  app.put(
    '/api/me/account',
    requireUser,
    rateLimit(30),
    wrap(async (req, res) => {
      const user = await fullUser(req.user.id);
      const name = text(req.body?.name, 60);
      const email = text(req.body?.email, 200).toLowerCase();
      const bio = text(req.body?.bio, 600);
      if (!name) throw httpError(400, 'name_required', 'Name fehlt');
      if (!EMAIL_RE.test(email)) throw httpError(400, 'invalid_email', 'Ungültige E-Mail');
      if (email !== user.email.toLowerCase()) {
        await checkPassword(user, req.body?.password);
        const { rows } = await query('SELECT 1 FROM users WHERE lower(email) = $1 AND id <> $2', [email, user.id]);
        if (rows.length) throw httpError(409, 'email_taken', 'E-Mail bereits registriert');
      }
      try {
        const { rows } = await query('UPDATE users SET name = $1, email = $2, bio = $3 WHERE id = $4 RETURNING *', [
          name,
          email,
          bio,
          user.id,
        ]);
        res.json({ user: userOut(rows[0]) });
      } catch (err) {
        if (err.code === '23505') throw httpError(409, 'email_taken', 'E-Mail bereits registriert');
        throw err;
      }
    }),
  );

  app.put(
    '/api/me/password',
    requireUser,
    rateLimit(20),
    wrap(async (req, res) => {
      const user = await fullUser(req.user.id);
      await checkPassword(user, req.body?.current);
      const next = String(req.body?.next || '');
      if (next.length < 8 || next.length > 200) throw httpError(400, 'weak_password', 'Passwort zu kurz');
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(next), user.id]);
      res.json({ ok: true });
    }),
  );

  app.put(
    '/api/me/privacy',
    requireUser,
    wrap(async (req, res) => {
      const { rows } = await query('UPDATE users SET show_visits = $1 WHERE id = $2 RETURNING *', [
        Boolean(req.body?.showVisits),
        req.user.id,
      ]);
      res.json({ user: userOut(rows[0]) });
    }),
  );

  app.delete(
    '/api/me/account',
    requireUser,
    rateLimit(10),
    wrap(async (req, res) => {
      const user = await fullUser(req.user.id);
      if (user.is_admin) throw httpError(400, 'admin_delete', 'Admin-Konten können nicht gelöscht werden');
      await checkPassword(user, req.body?.password);
      const { rows } = await query(
        `SELECT ep.key FROM escort_photos ep JOIN escorts e ON e.id = ep.escort_id WHERE e.user_id = $1
         UNION ALL
         SELECT pp.key FROM post_photos pp JOIN posts p ON p.id = pp.post_id JOIN escorts e ON e.id = p.escort_id
         WHERE e.user_id = $1`,
        [user.id],
      );
      // Profil, Fotos, Beiträge, Favoriten, Unterhaltungen usw. werden per ON DELETE CASCADE entfernt
      await query('DELETE FROM users WHERE id = $1', [user.id]);
      await removeImages(rows.map((r) => r.key));
      clearSession(res);
      res.json({ ok: true });
    }),
  );
}
