import crypto from 'node:crypto';
import express from 'express';
import { query } from '../db.js';
import { httpError, rateLimit, hashPassword, setSession, userOut } from '../auth.js';
import { wrap, requireDb } from '../http.js';
import { sendTemplate, appUrl } from '../mail/index.js';

// Passwort vergessen: Link per E-Mail (1 Stunde gültig, einmal nutzbar). Gespeichert wird nur ein
// Hash des Links. Die Antwort verrät nie, ob eine E-Mail-Adresse registriert ist.

const router = express.Router();
const VALID_MS = 60 * 60 * 1000;
const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

router.post(
  '/api/auth/forgot',
  rateLimit(8, 60 * 60 * 1000),
  requireDb,
  wrap(async (req, res) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const { rows } = await query('SELECT id, email, name, locale FROM users WHERE lower(email) = $1', [email]);
    const user = rows[0];
    if (user) {
      const token = crypto.randomBytes(32).toString('base64url');
      await query('DELETE FROM password_resets WHERE user_id = $1 OR expires_at < now()', [user.id]);
      await query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [
        user.id,
        hash(token),
        new Date(Date.now() + VALID_MS),
      ]);
      // Versand im Hintergrund, damit die Antwortzeit nichts über das Konto verrät
      sendTemplate(user, 'reset', {}, `${appUrl(req)}/reset?token=${token}`);
    }
    res.json({ ok: true });
  }),
);

router.post(
  '/api/auth/reset',
  rateLimit(20, 60 * 60 * 1000),
  requireDb,
  wrap(async (req, res) => {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (password.length < 8 || password.length > 200) throw httpError(400, 'weak_password', 'Passwort zu kurz');
    const { rows } = await query(
      'SELECT id, user_id FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()',
      [hash(token)],
    );
    if (!rows[0]) throw httpError(400, 'reset_invalid', 'Link ungültig oder abgelaufen');
    await query('UPDATE password_resets SET used_at = now() WHERE id = $1', [rows[0].id]);
    // neues Passwort setzen und alle bisherigen Sitzungen beenden
    const { rows: users } = await query(
      `UPDATE users SET password_hash = $1, session_version = session_version + 1, last_login_at = now()
       WHERE id = $2 RETURNING *`,
      [await hashPassword(password), rows[0].user_id],
    );
    setSession(req, res, users[0]);
    res.json({ user: userOut(users[0]) });
  }),
);

export default router;
