import express from 'express';
import { query } from '../db.js';
import { httpError, requireUser, rateLimit } from '../auth.js';
import { wrap, requireDb, noStore, text, toId } from '../http.js';
import { THUMB, thumbUrl } from '../escorts.js';

// Nachrichten zwischen Mitgliedern und Escort-Profilen

const router = express.Router();

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

export async function listConversations(me, limit = 100) {
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

export async function unreadCount(me) {
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

// ---------- Routen ----------

// --- Nachrichten ---

router.get(
  '/api/messages',
  requireUser,
  wrap(async (req, res) => {
    noStore(res);
    res.json(await listConversations(req.user.id));
  }),
);

router.get(
  '/api/messages/unread',
  requireUser,
  wrap(async (req, res) => {
    noStore(res);
    res.json({ count: await unreadCount(req.user.id) });
  }),
);

router.get(
  '/api/messages/:id',
  requireUser,
  wrap(async (req, res) => {
    const me = req.user.id;
    const c = await loadConversation(toId(req.params.id), me);
    await query(
      `UPDATE messages SET read_at = now()
       WHERE conversation_id = $1 AND read_at IS NULL AND sender_id IS DISTINCT FROM $2`,
      [c.id, me],
    );
    const after = Number(req.query.after) || 0;
    const { rows } = after
      ? await query('SELECT * FROM messages WHERE conversation_id = $1 AND id > $2 ORDER BY id LIMIT 200', [
          c.id,
          after,
        ])
      : await query(
          'SELECT * FROM (SELECT * FROM messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT 300) m ORDER BY id',
          [c.id],
        );
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

router.post(
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

router.post(
  '/api/messages/:id',
  requireUser,
  rateLimit(300, 10 * 60 * 1000),
  wrap(async (req, res) => {
    const c = await loadConversation(toId(req.params.id), req.user.id);
    res.status(201).json(await addMessage(c.id, req.user.id, messageBody(req.body?.body)));
  }),
);

export default router;
