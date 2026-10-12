import express from 'express';
import { query } from '../db.js';
import { httpError, requireUser, rateLimit } from '../auth.js';
import { wrap, requireDb, noStore, text, toId } from '../http.js';
import { THUMB, thumbUrl, ownEscort } from '../escorts.js';

// Bewertungen in beide Richtungen, je 1–5 Sterne und optional ein kurzer Text:
// - Mitglieder bewerten Escorts (escort_reviews)
// - Escorts bewerten Mitglieder (member_reviews)
// Eine Bewertung pro Person und Ziel; erneutes Bewerten ersetzt die alte.

const router = express.Router();
const PAGE = 10;

// Autor einer Bewertung: Mitglied (bei Escort-Bewertungen) bzw. Escort-Profil (bei Mitglieder-Bewertungen)
const memberAuthor = (r) => ({ kind: 'member', memberId: r.user_id, name: r.name, thumb: thumbUrl(r.avatar_key) });
const escortAuthor = (r) =>
  r.slug
    ? { kind: 'escort', slug: r.slug, name: r.escort_name, thumb: thumbUrl(r.thumb_key) }
    : { kind: 'member', memberId: r.user_id, name: r.name, thumb: null };

const TARGETS = {
  escort: {
    table: 'escort_reviews',
    key: 'escort_id',
    select: `SELECT r.*, u.name, u.avatar_key FROM escort_reviews r JOIN users u ON u.id = r.user_id`,
    author: memberAuthor,
    async find(slug, me) {
      const { rows } = await query('SELECT id, user_id, published FROM escorts WHERE slug = $1', [slug]);
      const e = rows[0];
      if (!e || (!e.published && e.user_id !== me.id && !me.is_admin)) {
        throw httpError(404, 'not_found', 'Profil nicht gefunden');
      }
      return e;
    },
    canRate: async (e, me) => me.role === 'member' && e.user_id !== me.id,
    denied: () => httpError(403, 'review_members_only', 'Nur Mitglieder können Escorts bewerten'),
  },
  member: {
    table: 'member_reviews',
    key: 'member_id',
    select: `SELECT r.*, u.name, e.slug, e.name AS escort_name, ${THUMB('e')} AS thumb_key
      FROM member_reviews r JOIN users u ON u.id = r.user_id
      LEFT JOIN escorts e ON e.user_id = r.user_id`,
    author: escortAuthor,
    async find(id) {
      const { rows } = await query("SELECT id FROM users WHERE id = $1 AND role = 'member'", [toId(id)]);
      if (!rows[0]) throw httpError(404, 'not_found', 'Nicht gefunden');
      return rows[0];
    },
    // nur Escorts mit eigenem Profil
    canRate: async (m, me) => me.role === 'escort' && m.id !== me.id && Boolean(await ownEscort(me.id)),
    denied: () => httpError(403, 'review_escorts_only', 'Nur Escorts können Mitglieder bewerten'),
  },
};

function reviewOut(T, r, me) {
  return {
    id: r.id,
    rating: r.rating,
    body: r.body,
    at: r.updated_at,
    edited: new Date(r.updated_at) - new Date(r.created_at) > 2000,
    author: T.author(r),
    mine: r.user_id === me.id,
    canDelete: r.user_id === me.id || Boolean(me.is_admin),
  };
}

export async function ratingSummary(table, key, id) {
  const { rows } = await query(
    `SELECT round(avg(rating)::numeric, 1)::float AS average, count(*)::int AS count,
       count(*) FILTER (WHERE rating = 5)::int AS r5, count(*) FILTER (WHERE rating = 4)::int AS r4,
       count(*) FILTER (WHERE rating = 3)::int AS r3, count(*) FILTER (WHERE rating = 2)::int AS r2,
       count(*) FILTER (WHERE rating = 1)::int AS r1
     FROM ${table} WHERE ${key} = $1`,
    [id],
  );
  return rows[0];
}

async function summary(T, target, me) {
  const [x, { rows: mine }, canRate] = await Promise.all([
    ratingSummary(T.table, T.key, target.id),
    query(`${T.select} WHERE r.${T.key} = $1 AND r.user_id = $2`, [target.id, me.id]),
    T.canRate(target, me),
  ]);
  return {
    average: x.average,
    count: x.count,
    distribution: [x.r5, x.r4, x.r3, x.r2, x.r1],
    mine: mine[0] ? reviewOut(T, mine[0], me) : null,
    canRate,
  };
}

async function page(T, target, me, before) {
  const args = [target.id];
  let cond = '';
  if (before) {
    args.push(before);
    cond = 'AND r.id < $2';
  }
  const { rows } = await query(
    `${T.select} WHERE r.${T.key} = $1 AND r.body <> '' ${cond} ORDER BY r.id DESC LIMIT ${PAGE}`,
    args,
  );
  return { items: rows.map((r) => reviewOut(T, r, me)), done: rows.length < PAGE };
}

const full = async (T, target, me) => ({ ...(await summary(T, target, me)), ...(await page(T, target, me, null)) });

// Routen für beide Richtungen: /api/escorts/:ref/… und /api/members/:ref/…
for (const [kind, T] of Object.entries(TARGETS)) {
  const base = kind === 'escort' ? '/api/escorts/:ref' : '/api/members/:ref';
  const del = kind === 'escort' ? '/api/reviews/:id' : '/api/member-reviews/:id';

  router.get(
    `${base}/reviews`,
    requireUser,
    requireDb,
    wrap(async (req, res) => {
      const target = await T.find(req.params.ref, req.user);
      const before = Number(req.query.before) || null;
      noStore(res);
      res.json(before ? await page(T, target, req.user, before) : await full(T, target, req.user));
    }),
  );

  router.put(
    `${base}/review`,
    requireUser,
    requireDb,
    rateLimit(30, 60 * 60 * 1000),
    wrap(async (req, res) => {
      const target = await T.find(req.params.ref, req.user);
      if (!(await T.canRate(target, req.user))) throw T.denied();
      const rating = Number(req.body?.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw httpError(400, 'review_rating', 'Bitte 1 bis 5 Sterne wählen');
      }
      await query(
        `INSERT INTO ${T.table} (${T.key}, user_id, rating, body) VALUES ($1, $2, $3, $4)
         ON CONFLICT (${T.key}, user_id) DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body, updated_at = now()`,
        [target.id, req.user.id, rating, text(req.body?.body, 1000)],
      );
      res.json(await full(T, target, req.user));
    }),
  );

  router.delete(
    del,
    requireUser,
    requireDb,
    wrap(async (req, res) => {
      const { rows } = await query(`SELECT id, user_id, ${T.key} AS target_id FROM ${T.table} WHERE id = $1`, [
        toId(req.params.id),
      ]);
      const r = rows[0];
      if (!r) throw httpError(404, 'not_found', 'Nicht gefunden');
      if (r.user_id !== req.user.id && !req.user.is_admin) throw httpError(403, 'forbidden', 'Keine Berechtigung');
      await query(`DELETE FROM ${T.table} WHERE id = $1`, [r.id]);
      res.json(await full(T, { id: r.target_id, user_id: null }, req.user));
    }),
  );
}

// Bewertungen, die ein Mitglied an Escorts vergeben hat (für sein Profil)
router.get(
  '/api/members/:ref/reviews/given',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    const member = await TARGETS.member.find(req.params.ref);
    const args = [member.id];
    let cond = '';
    const before = Number(req.query.before) || null;
    if (before) {
      args.push(before);
      cond = 'AND r.id < $2';
    }
    const { rows } = await query(
      `SELECT r.*, e.slug, e.name AS escort_name, ${THUMB('e')} AS thumb_key
       FROM escort_reviews r JOIN escorts e ON e.id = r.escort_id
       WHERE r.user_id = $1 AND (e.published = true OR e.user_id = $${args.length + 1}) ${cond}
       ORDER BY r.id DESC LIMIT ${PAGE}`,
      [...args, req.user.id],
    );
    noStore(res);
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        at: r.updated_at,
        escort: { kind: 'escort', slug: r.slug, name: r.escort_name, thumb: thumbUrl(r.thumb_key) },
      })),
      done: rows.length < PAGE,
    });
  }),
);

export default router;
