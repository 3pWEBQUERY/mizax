import { query } from './db.js';
import { sendTemplate, appUrl } from './mail/index.js';
import { unseenCount } from './suggestions.js';

// E-Mail-Benachrichtigungen. Inhalte von Nachrichten stehen nie in der E-Mail (Diskretion).
// Gegen Flut: höchstens eine E-Mail pro Unterhaltung / Beitrag in 30 Minuten,
// Vorschläge höchstens einmal pro Tag.

const KINDS = { messages: 'notify_messages', reviews: 'notify_reviews', comments: 'notify_comments' };

async function recipient(userId, kind) {
  const { rows } = await query(
    `SELECT id, email, name, locale, ${KINDS[kind] || 'notify_suggestions'} AS wanted FROM users WHERE id = $1`,
    [userId],
  );
  return rows[0]?.wanted ? rows[0] : null;
}

async function recentlySent(userId, kind, ref, interval) {
  const { rows } = await query(
    `SELECT 1 FROM notify_log WHERE user_id = $1 AND kind = $2 AND ref = $3 AND sent_at > now() - $4::interval LIMIT 1`,
    [userId, kind, String(ref), interval],
  );
  return rows.length > 0;
}

async function deliver(user, kind, ref, template, vars, path) {
  await query('INSERT INTO notify_log (user_id, kind, ref) VALUES ($1, $2, $3)', [user.id, kind, String(ref)]);
  await sendTemplate(user, template, vars, `${appUrl()}${path}`);
}

// Fehler in Benachrichtigungen dürfen die eigentliche Aktion nie stören
const safe =
  (fn) =>
  (...args) =>
    fn(...args).catch((err) => console.error('[notify]', err.message));

// Neue Bewertung (nur beim ersten Bewerten, nicht beim Bearbeiten)
export const notifyReview = safe(async (targetUserId, fromName, rating, path) => {
  if (!targetUserId) return;
  const user = await recipient(targetUserId, 'reviews');
  if (user) await deliver(user, 'reviews', path, 'review', { from: fromName, stars: '★'.repeat(rating) }, path);
});

// Kommentar auf einen eigenen Beitrag
export const notifyComment = safe(async (ownerId, commenterId, fromName, postId) => {
  if (!ownerId || ownerId === commenterId) return;
  const user = await recipient(ownerId, 'comments');
  if (!user || (await recentlySent(user.id, 'comments', postId, '30 minutes'))) return;
  await deliver(user, 'comments', postId, 'comment', { from: fromName }, '/feed');
});

// Ungelesene Nachrichten: eine E-Mail je Unterhaltung, sobald eine Nachricht 2 Minuten ungelesen ist –
// und erst wieder, wenn danach neue ungelesene Nachrichten kommen (nie mehrfach für dieselben)
async function unreadMessages() {
  const { rows } = await query(
    `SELECT c.id AS conv_id,
       CASE WHEN m.sender_id = c.user_id THEN e.user_id ELSE c.user_id END AS recipient,
       max(CASE WHEN m.sender_id = c.user_id THEN u.name ELSE e.name END) AS from_name,
       min(m.created_at) AS first_unread
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     JOIN escorts e ON e.id = c.escort_id
     JOIN users u ON u.id = c.user_id
     WHERE m.read_at IS NULL AND m.created_at > now() - interval '1 day'
     GROUP BY c.id, recipient
     HAVING min(m.created_at) < now() - interval '2 minutes'`,
  );
  for (const r of rows) {
    if (!r.recipient) continue;
    const user = await recipient(r.recipient, 'messages');
    if (!user) continue;
    const { rows: sent } = await query(
      `SELECT 1 FROM notify_log WHERE user_id = $1 AND kind = 'messages' AND ref = $2 AND sent_at >= $3 LIMIT 1`,
      [user.id, String(r.conv_id), r.first_unread],
    );
    if (sent.length) continue;
    await deliver(user, 'messages', r.conv_id, 'message', { from: r.from_name }, `/messages/${r.conv_id}`);
  }
}

// Neue Vorschläge: höchstens einmal pro Tag
async function suggestionDigest() {
  const { rows } = await query(
    `SELECT p.user_id FROM member_prefs p JOIN users u ON u.id = p.user_id
     WHERE p.enabled AND u.notify_suggestions
       AND NOT EXISTS (SELECT 1 FROM notify_log l WHERE l.user_id = p.user_id AND l.kind = 'suggestions'
                       AND l.sent_at > now() - interval '1 day')`,
  );
  for (const r of rows) {
    const n = await unseenCount(r.user_id);
    if (!n) continue;
    const user = await recipient(r.user_id, 'suggestions');
    if (user) await deliver(user, 'suggestions', '', n === 1 ? 'suggestionsOne' : 'suggestions', { n }, '/suggestions');
  }
}

// Hintergrund-Aufgaben: Nachrichten jede Minute, Vorschläge stündlich
export function startNotifier() {
  const run = (fn) => () => fn().catch((err) => console.error('[notify]', err.message));
  setInterval(run(unreadMessages), 60 * 1000).unref();
  setInterval(run(suggestionDigest), 60 * 60 * 1000).unref();
  setTimeout(run(suggestionDigest), 30 * 1000).unref();
  setInterval(
    () => query("DELETE FROM notify_log WHERE sent_at < now() - interval '30 days'").catch(() => {}),
    24 * 3600 * 1000,
  ).unref();
}
