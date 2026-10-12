import express from 'express';
import { query } from '../db.js';
import { httpError, requireUser, rateLimit } from '../auth.js';
import { wrap, requireDb, noStore, text, toId } from '../http.js';
import { thumbUrl } from '../escorts.js';

// Bewertungen von Escorts: Mitglieder vergeben 1–5 Sterne und optional einen kurzen Text.
// Eine Bewertung pro Mitglied und Escort; erneutes Bewerten ersetzt die alte.

const router = express.Router();
const PAGE = 10;

async function findEscort(slug, me) {
  const { rows } = await query('SELECT id, user_id, published FROM escorts WHERE slug = $1', [slug]);
  const e = rows[0];
  if (!e || (!e.published && e.user_id !== me.id && !me.is_admin)) {
    throw httpError(404, 'not_found', 'Profil nicht gefunden');
  }
  return e;
}

const canRate = (escort, me) => me.role === 'member' && escort.user_id !== me.id;

function reviewOut(r, me) {
  return {
    id: r.id,
    rating: r.rating,
    body: r.body,
    at: r.updated_at,
    edited: new Date(r.updated_at) - new Date(r.created_at) > 2000,
    author: { kind: 'member', memberId: r.user_id, name: r.name, thumb: thumbUrl(r.avatar_key) },
    mine: r.user_id === me.id,
    canDelete: r.user_id === me.id || Boolean(me.is_admin),
  };
}

const SELECT = `SELECT r.*, u.name, u.avatar_key FROM escort_reviews r JOIN users u ON u.id = r.user_id`;

async function summary(escort, me) {
  const [{ rows: s }, { rows: mine }] = await Promise.all([
    query(
      `SELECT round(avg(rating)::numeric, 1)::float AS average, count(*)::int AS count,
         count(*) FILTER (WHERE rating = 5)::int AS r5, count(*) FILTER (WHERE rating = 4)::int AS r4,
         count(*) FILTER (WHERE rating = 3)::int AS r3, count(*) FILTER (WHERE rating = 2)::int AS r2,
         count(*) FILTER (WHERE rating = 1)::int AS r1
       FROM escort_reviews WHERE escort_id = $1`,
      [escort.id],
    ),
    query(`${SELECT} WHERE r.escort_id = $1 AND r.user_id = $2`, [escort.id, me.id]),
  ]);
  const x = s[0];
  return {
    average: x.average,
    count: x.count,
    distribution: [x.r5, x.r4, x.r3, x.r2, x.r1],
    mine: mine[0] ? reviewOut(mine[0], me) : null,
    canRate: canRate(escort, me),
  };
}

async function page(escort, me, before) {
  const args = [escort.id];
  let cond = '';
  if (before) {
    args.push(before);
    cond = 'AND r.id < $2';
  }
  const { rows } = await query(
    `${SELECT} WHERE r.escort_id = $1 AND r.body <> '' ${cond} ORDER BY r.id DESC LIMIT ${PAGE}`,
    args,
  );
  return { items: rows.map((r) => reviewOut(r, me)), done: rows.length < PAGE };
}

router.get(
  '/api/escorts/:slug/reviews',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    const escort = await findEscort(req.params.slug, req.user);
    const before = Number(req.query.before) || null;
    noStore(res);
    if (before) return res.json(await page(escort, req.user, before));
    res.json({ ...(await summary(escort, req.user)), ...(await page(escort, req.user, null)) });
  }),
);

router.put(
  '/api/escorts/:slug/review',
  requireUser,
  requireDb,
  rateLimit(30, 60 * 60 * 1000),
  wrap(async (req, res) => {
    const escort = await findEscort(req.params.slug, req.user);
    if (!canRate(escort, req.user)) throw httpError(403, 'review_members_only', 'Nur Mitglieder können bewerten');
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw httpError(400, 'review_rating', 'Bitte 1 bis 5 Sterne wählen');
    }
    await query(
      `INSERT INTO escort_reviews (escort_id, user_id, rating, body) VALUES ($1, $2, $3, $4)
       ON CONFLICT (escort_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body, updated_at = now()`,
      [escort.id, req.user.id, rating, text(req.body?.body, 1000)],
    );
    res.json({ ...(await summary(escort, req.user)), ...(await page(escort, req.user, null)) });
  }),
);

router.delete(
  '/api/reviews/:id',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    const { rows } = await query(
      'SELECT r.id, r.user_id, e.slug FROM escort_reviews r JOIN escorts e ON e.id = r.escort_id WHERE r.id = $1',
      [toId(req.params.id)],
    );
    const r = rows[0];
    if (!r) throw httpError(404, 'not_found', 'Nicht gefunden');
    if (r.user_id !== req.user.id && !req.user.is_admin) throw httpError(403, 'forbidden', 'Keine Berechtigung');
    await query('DELETE FROM escort_reviews WHERE id = $1', [r.id]);
    const escort = await findEscort(r.slug, req.user);
    res.json({ ...(await summary(escort, req.user)), ...(await page(escort, req.user, null)) });
  }),
);

export default router;
