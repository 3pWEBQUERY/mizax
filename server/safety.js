import { query } from './db.js';

// Blockieren und Melden: gemeinsame Hilfen für die Routen

// SQL-Bedingung: zwischen $me und der Spalte `col` besteht keine Blockierung (in beide Richtungen)
export const notBlocked = (me, col) =>
  `NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id = ${me} AND b.blocked_id = ${col})
     OR (b.user_id = ${col} AND b.blocked_id = ${me}))`;

// 'me' = ich habe blockiert, 'them' = ich wurde blockiert, null = keine Blockierung
export async function blockState(me, other) {
  if (!me || !other || me === other) return null;
  const { rows } = await query(
    'SELECT user_id FROM blocks WHERE (user_id = $1 AND blocked_id = $2) OR (user_id = $2 AND blocked_id = $1)',
    [me, other],
  );
  if (!rows.length) return null;
  return rows.some((r) => r.user_id === me) ? 'me' : 'them';
}

export const REPORT_KINDS = ['escort', 'member', 'post', 'comment', 'review', 'member_review'];
export const REPORT_REASONS = ['spam', 'fake', 'harassment', 'inappropriate', 'underage', 'scam', 'other'];

// Ziel einer Meldung: Kurzbeschreibung und Link für die Verwaltung
export async function reportTarget(kind, id) {
  const one = async (sql) => (await query(sql, [id])).rows[0] || null;
  switch (kind) {
    case 'escort': {
      const e = await one('SELECT id, slug, name, user_id, published FROM escorts WHERE id = $1');
      return e && { title: e.name, text: '', link: `/escort/${e.slug}`, userId: e.user_id, published: e.published };
    }
    case 'member': {
      const u = await one('SELECT id, name, bio FROM users WHERE id = $1');
      return u && { title: u.name, text: u.bio || '', link: `/member/${u.id}`, userId: u.id };
    }
    case 'post': {
      const p = await one(
        `SELECT p.id, p.body, COALESCE(e.name, u.name) AS author, COALESCE(e.user_id, p.user_id) AS user_id,
           e.slug, p.user_id AS member_id
         FROM posts p LEFT JOIN escorts e ON e.id = p.escort_id LEFT JOIN users u ON u.id = p.user_id
         WHERE p.id = $1`,
      );
      return (
        p && {
          title: p.author,
          text: p.body,
          link: p.slug ? `/escort/${p.slug}?tab=posts` : `/member/${p.member_id}?tab=posts`,
          userId: p.user_id,
          removable: true,
        }
      );
    }
    case 'comment': {
      const c = await one(
        `SELECT k.id, k.body, k.user_id, u.name FROM post_comments k JOIN users u ON u.id = k.user_id WHERE k.id = $1`,
      );
      return c && { title: c.name, text: c.body, link: '/feed', userId: c.user_id, removable: true };
    }
    case 'review': {
      const r = await one(
        `SELECT r.id, r.body, r.rating, r.user_id, u.name, e.slug FROM escort_reviews r
         JOIN users u ON u.id = r.user_id JOIN escorts e ON e.id = r.escort_id WHERE r.id = $1`,
      );
      return (
        r && {
          title: `${r.name} · ${'★'.repeat(r.rating)}`,
          text: r.body,
          link: `/escort/${r.slug}?tab=reviews`,
          userId: r.user_id,
          removable: true,
        }
      );
    }
    case 'member_review': {
      const r = await one(
        `SELECT r.id, r.body, r.rating, r.user_id, r.member_id, u.name FROM member_reviews r
         JOIN users u ON u.id = r.user_id WHERE r.id = $1`,
      );
      return (
        r && {
          title: `${r.name} · ${'★'.repeat(r.rating)}`,
          text: r.body,
          link: `/member/${r.member_id}?tab=reviews`,
          userId: r.user_id,
          removable: true,
        }
      );
    }
    default:
      return null;
  }
}

// Gemeldeten Inhalt löschen (nur Beiträge, Kommentare und Bewertungen)
export async function removeTarget(kind, id) {
  const table = { post: 'posts', comment: 'post_comments', review: 'escort_reviews', member_review: 'member_reviews' }[
    kind
  ];
  if (!table) return false;
  if (kind === 'post') {
    const { rows } = await query('SELECT key FROM post_photos WHERE post_id = $1', [id]);
    await query('DELETE FROM posts WHERE id = $1', [id]);
    return rows.map((r) => r.key);
  }
  await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  return [];
}
