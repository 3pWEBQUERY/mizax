import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { query, hasDb } from './db.js';

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'mizax_sid';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 Tage

export const SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`mizax:${process.env.ADMIN_PASSWORD || 'dev'}`).digest('hex');

export function httpError(status, code, message) {
  return Object.assign(new Error(message || code), { status, code });
}

// ---------- Passwörter ----------

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(pw, stored) {
  const [algo, saltB64, hashB64] = String(stored).split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(pw, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// ---------- Signierte Tokens ----------

export function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function verifySigned(token = '') {
  const idx = token.lastIndexOf('.');
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const sig = Buffer.from(token.slice(idx + 1));
  const expected = Buffer.from(sign(payload));
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return null;
  const parts = payload.split('.');
  const exp = Number(parts[parts.length - 1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  return parts;
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function setSession(req, res, userId) {
  const payload = `u.${userId}.${Date.now() + MAX_AGE * 1000}`;
  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  res.append(
    'Set-Cookie',
    `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? '; Secure' : ''}`,
  );
}

export function clearSession(res) {
  res.append('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function userOut(u) {
  return u && { id: u.id, email: u.email, name: u.name, role: u.role, locale: u.locale, isAdmin: Boolean(u.is_admin) };
}

// Hängt den angemeldeten Benutzer (falls vorhanden) an req.user
export async function attachUser(req, res, next) {
  req.user = null;
  const token = parseCookies(req.headers.cookie)[COOKIE];
  const parts = token && verifySigned(token);
  if (parts && parts[0] === 'u' && hasDb()) {
    try {
      const { rows } = await query('SELECT id, email, name, role, locale, is_admin FROM users WHERE id = $1', [
        Number(parts[1]),
      ]);
      req.user = rows[0] || null;
    } catch {
      req.user = null;
    }
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return next(httpError(401, 'login_required', 'Bitte melde dich an'));
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return next(httpError(401, 'login_required', 'Bitte melde dich an'));
  if (!req.user.is_admin) return next(httpError(403, 'forbidden', 'Keine Berechtigung'));
  next();
}

// Legt beim Start das Admin-Konto aus ADMIN_EMAIL/ADMIN_PASSWORD an (falls noch nicht vorhanden)
// bzw. gibt einem bestehenden Konto mit dieser E-Mail Admin-Rechte. Das Passwort wird nur beim
// Anlegen gesetzt, damit eine spätere Änderung nicht überschrieben wird.
export async function ensureAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) return null;
  const { rows } = await query('SELECT id FROM users WHERE lower(email) = $1', [email]);
  if (rows[0]) {
    await query('UPDATE users SET is_admin = true WHERE id = $1', [rows[0].id]);
    return email;
  }
  await query(
    `INSERT INTO users (email, password_hash, name, role, is_admin) VALUES ($1, $2, 'Admin', 'member', true)`,
    [email, await hashPassword(password)],
  );
  console.log(`[admin] Admin-Konto ${email} angelegt`);
  return email;
}

export function requireEscort(req, res, next) {
  if (!req.user) return next(httpError(401, 'login_required', 'Bitte melde dich an'));
  if (req.user.role !== 'escort') return next(httpError(403, 'escort_only', 'Nur für Escort-Konten'));
  next();
}

// ---------- einfaches Rate-Limit für Login/Registrierung ----------

const hits = new Map();
export function rateLimit(max = 30, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++entry.count > max) return next(httpError(429, 'rate_limited', 'Zu viele Versuche'));
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
}, 60_000).unref();

// ---------- Registrierung / Login ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LOCALES = ['de', 'en', 'fr', 'es', 'hu', 'pl', 'ro'];

export async function register(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim().slice(0, 60);
  const role = body.role;
  const locale = LOCALES.includes(body.locale) ? body.locale : 'de';
  if (!['member', 'escort'].includes(role)) throw httpError(400, 'role_required', 'Bitte Kontotyp wählen');
  if (!name) throw httpError(400, 'name_required', 'Name fehlt');
  if (!EMAIL_RE.test(email) || email.length > 200) throw httpError(400, 'invalid_email', 'Ungültige E-Mail');
  if (password.length < 8 || password.length > 200) throw httpError(400, 'weak_password', 'Passwort zu kurz');
  if (body.adult !== true) throw httpError(400, 'age_confirm_required', 'Altersbestätigung fehlt');

  const { rows: existing } = await query('SELECT 1 FROM users WHERE lower(email) = $1', [email]);
  if (existing.length) throw httpError(409, 'email_taken', 'E-Mail bereits registriert');

  const hash = await hashPassword(password);
  try {
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name, role, locale, last_login_at)
       VALUES ($1,$2,$3,$4,$5, now()) RETURNING id, email, name, role, locale, is_admin`,
      [email, hash, name, role, locale],
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw httpError(409, 'email_taken', 'E-Mail bereits registriert');
    throw err;
  }
}

export async function login(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = $1', [email]);
  const user = rows[0];
  // gleiche Laufzeit auch bei unbekannter E-Mail
  const ok = user
    ? await verifyPassword(password, user.password_hash)
    : (await hashPassword(password), false);
  if (!ok) throw httpError(401, 'invalid_credentials', 'E-Mail oder Passwort falsch');
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  return user;
}
