import express from 'express';
import { query } from '../db.js';
import {
  register,
  login,
  setSession,
  clearSession,
  userOut,
  requireUser,
  rateLimit,
  httpError,
  verifyPassword,
  hashPassword,
} from '../auth.js';
import { wrap, requireDb, text } from '../http.js';
import { removeImages } from '../media.js';

// Registrierung, Anmeldung und Konto-Einstellungen

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const router = express.Router();

// ---------- Konto ----------

router.post(
  '/api/auth/register',
  rateLimit(20),
  requireDb,
  wrap(async (req, res) => {
    const user = await register(req.body || {});
    setSession(req, res, user.id);
    res.status(201).json({ user: userOut(user) });
  }),
);

router.post(
  '/api/auth/login',
  rateLimit(30),
  requireDb,
  wrap(async (req, res) => {
    const user = await login(req.body || {});
    setSession(req, res, user.id);
    res.json({ user: userOut(user) });
  }),
);

router.post('/api/auth/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/api/auth/me', (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  res.json({ user: userOut(req.user) });
});

router.put(
  '/api/auth/locale',
  requireUser,
  wrap(async (req, res) => {
    const locale = String(req.body?.locale || '');
    if (['de', 'en', 'fr', 'es', 'hu', 'pl', 'ro'].includes(locale)) {
      await query('UPDATE users SET locale = $1 WHERE id = $2', [locale, req.user.id]);
    }
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

router.put(
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

router.put(
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

router.put(
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

router.delete(
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

export default router;
