import express from 'express';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { SECRET, httpError, requireUser, rateLimit, showsVisits, clientIp } from '../auth.js';
import { wrap, requireDb, noStore, toId } from '../http.js';
import { THUMB, thumbUrl, ownEscort } from '../escorts.js';
import { listConversations, unreadCount } from './messages.js';
import { loadPosts } from './feed.js';

// Profilaufrufe, Mitgliederprofile, Statistik und Übersicht für die Seitenleiste

const TZ = 'Europe/Zurich';
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless/i;

const router = express.Router();

// ---------- Profilaufrufe ----------

// Gäste werden nur über einen täglich wechselnden, nicht umkehrbaren Schlüssel gezählt –
// IP-Adresse und Browserkennung selbst werden nicht gespeichert.
function guestKey(req) {
  const day = new Date().toISOString().slice(0, 10);
  const hash = crypto
    .createHmac('sha256', SECRET)
    .update(`${day}|${clientIp(req)}|${req.get('user-agent') || ''}`)
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
    profile: {
      slug: escort.slug,
      name: escort.name,
      published: escort.published,
    },
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
        return {
          kind: 'escort',
          at,
          visits: v.visits,
          name: v.escort_name,
          slug: v.slug,
          thumb: thumbUrl(v.thumb_key),
        };
      }
      return {
        kind: 'member',
        at,
        visits: v.visits,
        name: v.name,
        memberId: v.viewer_id,
      };
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
        return {
          kind: 'escort',
          at,
          visits: v.visits,
          name: v.escort_name,
          slug: v.slug,
          thumb: thumbUrl(v.thumb_key),
        };
      }
      return {
        kind: 'member',
        at,
        visits: v.visits,
        name: v.name,
        memberId: v.viewer_id,
      };
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

// ---------- Routen ----------

// --- Profilaufrufe ---

router.post(
  '/api/escorts/:slug/view',
  requireDb,
  rateLimit(60, 10 * 60 * 1000),
  wrap(async (req, res) => {
    await recordEscortView(req, req.params.slug);
    res.json({ ok: true });
  }),
);

// --- Mitgliederprofile (sichtbar für Escorts, die Verwaltung und das Mitglied selbst) ---

router.get(
  '/api/members/:id',
  requireUser,
  wrap(async (req, res) => {
    const memberId = toId(req.params.id);
    const self = memberId === req.user.id;
    if (!self && req.user.role !== 'escort' && !req.user.is_admin)
      throw httpError(403, 'forbidden', 'Keine Berechtigung');
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

router.post(
  '/api/members/:id/view',
  requireUser,
  wrap(async (req, res) => {
    const memberId = toId(req.params.id);
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

router.get(
  '/api/me/stats',
  requireUser,
  wrap(async (req, res) => {
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    noStore(res);
    res.json(await buildStats(req.user, days));
  }),
);

router.get(
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
      stats: {
        role: stats.role,
        profile: stats.profile ?? null,
        totals: stats.totals || null,
        series: stats.series || [],
      },
      posts,
    });
  }),
);

export default router;
