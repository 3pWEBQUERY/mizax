import express from 'express';
import compression from 'compression';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { query, migrate, hasDb } from './db.js';
import { hasStorage, putObject, getObject, deleteObject } from './storage.js';
import { seedIfEmpty, slugify } from './seed.js';
import {
  attachUser,
  requireUser,
  requireEscort,
  rateLimit,
  register,
  login,
  setSession,
  clearSession,
  userOut,
  requireAdmin,
  ensureAdmin,
  httpError,
} from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(compression());
app.use(express.json({ limit: '1mb' }));

const MAX_PHOTOS = 20;

// Uploads landen zuerst als temporäre Dateien auf der Platte (nicht im RAM) und werden
// nach der Antwort wieder gelöscht.
const upload = multer({
  dest: path.join(os.tmpdir(), 'mizax-uploads'),
  limits: { fileSize: 20 * 1024 * 1024, files: MAX_PHOTOS },
});

function uploadPhotos(req, res, next) {
  res.on('close', () => {
    for (const f of req.files || []) fs.promises.unlink(f.path).catch(() => {});
  });
  upload.array('photos', MAX_PHOTOS)(req, res, next);
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Serialisierung ----------

function photoOut(p) {
  return {
    id: p.id,
    url: `/media/${p.key}.webp`,
    thumb: `/media/${p.key}_sm.webp`,
    width: p.width,
    height: p.height,
  };
}

function escortOut(row, photos = []) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    age: row.age,
    city: row.city,
    tagline: row.tagline,
    bio: row.bio,
    height: row.height,
    nationality: row.nationality,
    languages: row.languages,
    services: row.services,
    rates: row.rates,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    accent: row.accent,
    verified: row.verified,
    available: row.available,
    featured: row.featured,
    published: row.published,
    sort: row.sort,
    userId: row.user_id,
    photos: photos.map(photoOut),
    full: true,
  };
}

// Für nicht angemeldete Besucher: nur die Daten der Karte
function cardOut(e) {
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    age: e.age,
    city: e.city,
    accent: e.accent,
    verified: e.verified,
    available: e.available,
    featured: e.featured,
    photos: e.photos,
    tagline: '',
    services: [],
    full: false,
  };
}

async function loadPhotos(ids) {
  if (!ids.length) return new Map();
  const { rows } = await query(
    'SELECT * FROM escort_photos WHERE escort_id = ANY($1) ORDER BY position, id',
    [ids],
  );
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.escort_id)) map.set(r.escort_id, []);
    map.get(r.escort_id).push(r);
  }
  return map;
}

async function listEscorts({ includeUnpublished = false } = {}) {
  const { rows } = await query(
    `SELECT * FROM escorts ${includeUnpublished ? '' : 'WHERE published = true'}
     ORDER BY created_at DESC, id DESC`,
  );
  const photos = await loadPhotos(rows.map((r) => r.id));
  return rows.map((r) => escortOut(r, photos.get(r.id) || []));
}

async function getEscortById(id) {
  const { rows } = await query('SELECT * FROM escorts WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const photos = await loadPhotos([id]);
  return escortOut(rows[0], photos.get(id) || []);
}

function requireDb(req, res, next) {
  if (!hasDb()) return next(httpError(503, 'db_unavailable', 'Datenbank nicht verbunden'));
  next();
}

// ---------- Profil-Eingaben ----------

const toList = (v) =>
  (Array.isArray(v) ? v : String(v || '').split(','))
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 30);

function escortInput(body) {
  const age = Number(body.age);
  if (!body.name || !String(body.name).trim()) throw httpError(400, 'name_required', 'Name fehlt');
  if (!Number.isInteger(age) || age < 18 || age > 99) {
    throw httpError(400, 'age_min', 'Alter muss mindestens 18 sein');
  }
  const rates = Array.isArray(body.rates)
    ? body.rates
        .filter((r) => r && (r.label || r.price))
        .slice(0, 20)
        .map((r) => ({ label: String(r.label || '').slice(0, 60), price: String(r.price || '').slice(0, 40) }))
    : [];
  const str = (v, n = 200) => String(v || '').trim().slice(0, n);
  return {
    name: str(body.name, 60),
    age,
    city: str(body.city, 80),
    tagline: str(body.tagline, 200),
    bio: str(body.bio, 5000),
    height: body.height ? Number(body.height) || null : null,
    nationality: str(body.nationality, 80),
    languages: toList(body.languages),
    services: toList(body.services),
    rates: JSON.stringify(rates),
    phone: str(body.phone, 40),
    whatsapp: str(body.whatsapp, 40),
    email: str(body.email, 200),
    accent: /^#[0-9a-fA-F]{6}$/.test(body.accent || '') ? body.accent : '#6d4aff',
    verified: Boolean(body.verified),
    available: body.available === undefined ? true : Boolean(body.available),
    featured: Boolean(body.featured),
    published: body.published === undefined ? true : Boolean(body.published),
    sort: Number(body.sort) || 0,
  };
}

const FIELDS = [
  'name', 'age', 'city', 'tagline', 'bio', 'height', 'nationality', 'languages', 'services',
  'rates', 'phone', 'whatsapp', 'email', 'accent', 'verified', 'available', 'featured',
  'published', 'sort',
];
// Diese Felder darf nur die Verwaltung setzen
const SELF_FIELDS = FIELDS.filter((f) => !['verified', 'featured', 'sort'].includes(f));

async function uniqueSlug(base, excludeId = 0) {
  let slug = base || 'profil';
  for (let i = 2; ; i++) {
    const { rows } = await query('SELECT 1 FROM escorts WHERE slug = $1 AND id <> $2', [slug, excludeId]);
    if (!rows.length) return slug;
    slug = `${base}-${i}`;
  }
}

async function insertEscort(data, extra = {}) {
  const slug = await uniqueSlug(slugify(`${data.name} ${data.city}`));
  const all = { ...data, ...extra, slug };
  const cols = Object.keys(all);
  const { rows } = await query(
    `INSERT INTO escorts (${cols.join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING id`,
    cols.map((c) => all[c]),
  );
  return rows[0].id;
}

async function updateEscort(id, data, fields) {
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const { rowCount } = await query(`UPDATE escorts SET ${sets}, updated_at = now() WHERE id = $1`, [
    id,
    ...fields.map((f) => data[f]),
  ]);
  return rowCount > 0;
}

// ---------- Fotos ----------

async function savePhotos(escortId, files = []) {
  if (!hasStorage()) throw httpError(503, 'storage_unavailable', 'Bucket nicht verbunden');
  const { rows: maxRows } = await query(
    'SELECT COALESCE(MAX(position), -1)::int AS m, count(*)::int AS n FROM escort_photos WHERE escort_id = $1',
    [escortId],
  );
  const images = files.filter((f) => /^image\//.test(f.mimetype));
  if (maxRows[0].n + images.length > MAX_PHOTOS) {
    throw httpError(400, 'too_many_photos', `Maximal ${MAX_PHOTOS} Fotos pro Profil`);
  }
  let position = maxRows[0].m + 1;
  for (const file of files) {
    if (!/^image\//.test(file.mimetype)) continue;
    const base = sharp(file.path, { failOn: 'none' }).rotate();
    const large = await base
      .clone()
      .resize({ width: 1600, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const small = await base
      .clone()
      .resize({ width: 640, height: 960, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const key = `escorts/${escortId}/${crypto.randomUUID()}`;
    await putObject(`${key}.webp`, large.data, 'image/webp');
    await putObject(`${key}_sm.webp`, small, 'image/webp');
    await query(
      'INSERT INTO escort_photos (escort_id, key, width, height, position) VALUES ($1,$2,$3,$4,$5)',
      [escortId, key, large.info.width, large.info.height, position++],
    );
  }
}

async function reorderPhotos(escortId, ids) {
  for (let i = 0; i < ids.length; i++) {
    await query('UPDATE escort_photos SET position = $1 WHERE id = $2 AND escort_id = $3', [
      i,
      Number(ids[i]),
      escortId,
    ]);
  }
}

async function deletePhoto(photoId, escortId = null) {
  const { rows } = await query(
    `DELETE FROM escort_photos WHERE id = $1 ${escortId ? 'AND escort_id = $2' : ''} RETURNING key, escort_id`,
    escortId ? [photoId, escortId] : [photoId],
  );
  if (!rows[0]) throw httpError(404, 'not_found', 'Nicht gefunden');
  await Promise.allSettled([deleteObject(`${rows[0].key}.webp`), deleteObject(`${rows[0].key}_sm.webp`)]);
  return rows[0].escort_id;
}

async function deleteEscort(id) {
  const { rows } = await query('SELECT key FROM escort_photos WHERE escort_id = $1', [id]);
  await query('DELETE FROM escorts WHERE id = $1', [id]);
  await Promise.allSettled(
    rows.flatMap((r) => [deleteObject(`${r.key}.webp`), deleteObject(`${r.key}_sm.webp`)]),
  );
}

// ---------- Öffentliche API ----------

app.use('/api', attachUser);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: hasDb(), storage: hasStorage() });
});

app.get(
  '/api/escorts',
  requireDb,
  wrap(async (req, res) => {
    const escorts = await listEscorts();
    res.set('Cache-Control', 'private, max-age=0');
    res.json(req.user ? escorts : escorts.map(cardOut));
  }),
);

app.get(
  '/api/escorts/:slug',
  requireDb,
  wrap(async (req, res) => {
    const { rows } = await query('SELECT * FROM escorts WHERE slug = $1 AND published = true', [
      req.params.slug,
    ]);
    if (!rows[0]) throw httpError(404, 'not_found', 'Profil nicht gefunden');
    const photos = await loadPhotos([rows[0].id]);
    const escort = escortOut(rows[0], photos.get(rows[0].id) || []);
    res.set('Cache-Control', 'private, max-age=0');
    res.json(req.user ? escort : cardOut(escort));
  }),
);

// Medien aus dem Railway Bucket ausliefern (Bucket ist privat)
app.get(
  /^\/media\/(.+)$/,
  wrap(async (req, res) => {
    const key = req.params[0];
    if (!/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.includes('..')) return res.status(400).end();
    try {
      const obj = await getObject(key);
      res.set('Content-Type', obj.ContentType || 'image/webp');
      if (obj.ContentLength) res.set('Content-Length', String(obj.ContentLength));
      if (obj.ETag) res.set('ETag', obj.ETag);
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      obj.Body.pipe(res);
    } catch (err) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NoSuchKey') {
        return res.status(404).end();
      }
      throw err;
    }
  }),
);

// ---------- Konto ----------

app.post(
  '/api/auth/register',
  rateLimit(20),
  requireDb,
  wrap(async (req, res) => {
    const user = await register(req.body || {});
    setSession(req, res, user.id);
    res.status(201).json({ user: userOut(user) });
  }),
);

app.post(
  '/api/auth/login',
  rateLimit(30),
  requireDb,
  wrap(async (req, res) => {
    const user = await login(req.body || {});
    setSession(req, res, user.id);
    res.json({ user: userOut(user) });
  }),
);

app.post('/api/auth/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  res.json({ user: userOut(req.user) });
});

app.put(
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

// ---------- Favoriten ----------

app.get(
  '/api/me/favorites',
  requireUser,
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT e.slug FROM favorites f JOIN escorts e ON e.id = f.escort_id
       WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
      [req.user.id],
    );
    res.set('Cache-Control', 'private, no-store');
    res.json(rows.map((r) => r.slug));
  }),
);

app.put(
  '/api/me/favorites/:slug',
  requireUser,
  wrap(async (req, res) => {
    await query(
      `INSERT INTO favorites (user_id, escort_id)
       SELECT $1, id FROM escorts WHERE slug = $2 ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.slug],
    );
    res.json({ ok: true });
  }),
);

app.delete(
  '/api/me/favorites/:slug',
  requireUser,
  wrap(async (req, res) => {
    await query(
      'DELETE FROM favorites WHERE user_id = $1 AND escort_id = (SELECT id FROM escorts WHERE slug = $2)',
      [req.user.id, req.params.slug],
    );
    res.json({ ok: true });
  }),
);

// ---------- Eigenes Escort-Profil ----------

async function ownEscortId(userId) {
  const { rows } = await query('SELECT id FROM escorts WHERE user_id = $1', [userId]);
  return rows[0]?.id || null;
}

async function requireOwnEscort(req) {
  const id = await ownEscortId(req.user.id);
  if (!id) throw httpError(404, 'profile_missing', 'Bitte speichere zuerst dein Profil');
  return id;
}

app.get(
  '/api/me/profile',
  requireEscort,
  wrap(async (req, res) => {
    const id = await ownEscortId(req.user.id);
    res.set('Cache-Control', 'private, no-store');
    res.json(id ? await getEscortById(id) : null);
  }),
);

app.put(
  '/api/me/profile',
  requireEscort,
  wrap(async (req, res) => {
    const data = escortInput(req.body || {});
    let id = await ownEscortId(req.user.id);
    if (id) {
      await updateEscort(id, data, SELF_FIELDS);
    } else {
      const own = Object.fromEntries(SELF_FIELDS.map((f) => [f, data[f]]));
      id = await insertEscort(own, { user_id: req.user.id, sort: 100 });
    }
    res.json(await getEscortById(id));
  }),
);

app.post(
  '/api/me/profile/photos',
  requireEscort,
  uploadPhotos,
  wrap(async (req, res) => {
    const id = await requireOwnEscort(req);
    await savePhotos(id, req.files);
    res.json(await getEscortById(id));
  }),
);

app.put(
  '/api/me/profile/photos/order',
  requireEscort,
  wrap(async (req, res) => {
    const id = await requireOwnEscort(req);
    await reorderPhotos(id, Array.isArray(req.body?.ids) ? req.body.ids : []);
    res.json(await getEscortById(id));
  }),
);

app.delete(
  '/api/me/photos/:id',
  requireEscort,
  wrap(async (req, res) => {
    const id = await requireOwnEscort(req);
    await deletePhoto(Number(req.params.id), id);
    res.json(await getEscortById(id));
  }),
);

// ---------- Admin API ----------

app.get('/api/admin/status', requireAdmin, (req, res) => {
  res.json({ ok: true, db: hasDb(), storage: hasStorage() });
});

app.get(
  '/api/admin/escorts',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    res.json(await listEscorts({ includeUnpublished: true }));
  }),
);

app.get(
  '/api/admin/users',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT u.id, u.email, u.name, u.role, u.locale, u.is_admin, u.created_at, u.last_login_at, e.slug
       FROM users u LEFT JOIN escorts e ON e.user_id = u.id
       ORDER BY u.is_admin DESC, u.created_at DESC LIMIT 500`,
    );
    res.json(rows);
  }),
);

app.put(
  '/api/admin/users/:id/admin',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const isAdmin = Boolean(req.body?.isAdmin);
    if (id === req.user.id && !isAdmin) {
      throw httpError(400, 'self_admin', 'Eigene Admin-Rechte können nicht entzogen werden');
    }
    const { rowCount } = await query('UPDATE users SET is_admin = $1 WHERE id = $2', [isAdmin, id]);
    if (!rowCount) throw httpError(404, 'not_found', 'Nicht gefunden');
    res.json({ ok: true });
  }),
);

app.post(
  '/api/admin/escorts',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const data = escortInput(req.body || {});
    const id = await insertEscort(Object.fromEntries(FIELDS.map((f) => [f, data[f]])));
    res.status(201).json(await getEscortById(id));
  }),
);

app.put(
  '/api/admin/escorts/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await updateEscort(id, escortInput(req.body || {}), FIELDS))) {
      throw httpError(404, 'not_found', 'Nicht gefunden');
    }
    res.json(await getEscortById(id));
  }),
);

app.delete(
  '/api/admin/escorts/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    await deleteEscort(Number(req.params.id));
    res.json({ ok: true });
  }),
);

app.post(
  '/api/admin/escorts/:id/photos',
  requireAdmin,
  requireDb,
  uploadPhotos,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await getEscortById(id))) throw httpError(404, 'not_found', 'Nicht gefunden');
    await savePhotos(id, req.files);
    res.json(await getEscortById(id));
  }),
);

app.put(
  '/api/admin/escorts/:id/photos/order',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    await reorderPhotos(id, Array.isArray(req.body?.ids) ? req.body.ids : []);
    res.json(await getEscortById(id));
  }),
);

app.delete(
  '/api/admin/photos/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const escortId = await deletePhoto(Number(req.params.id));
    res.json(await getEscortById(escortId));
  }),
);

app.use('/api', (req, res) => res.status(404).json({ error: 'Nicht gefunden', code: 'not_found' }));

// ---------- Frontend ----------

if (fs.existsSync(dist)) {
  app.use(
    '/assets',
    express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }),
  );
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  let status = err.status || 500;
  let code = err.code;
  if (err instanceof multer.MulterError) {
    status = 400;
    code = 'upload_invalid';
  }
  if (status >= 500) console.error(err);
  const known = Boolean(err.status) || err instanceof multer.MulterError;
  res.status(status).json({
    error: status >= 500 ? 'Serverfehler' : err.message,
    code: known && typeof code === 'string' ? code : 'server_error',
  });
});

async function start() {
  if (hasDb()) {
    for (let attempt = 1; ; attempt++) {
      try {
        await migrate();
        await seedIfEmpty();
        const adminEmail = await ensureAdmin();
        if (!adminEmail) console.warn('[admin] ADMIN_EMAIL/ADMIN_PASSWORD fehlen – kein Admin-Konto angelegt');
        break;
      } catch (err) {
        if (attempt >= 10) throw err;
        console.warn(`[db] Verbindung fehlgeschlagen (Versuch ${attempt}): ${err.message}`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  } else {
    console.warn('[db] DATABASE_URL fehlt – API läuft ohne Datenbank');
  }
  if (!hasStorage()) console.warn('[storage] Railway Bucket nicht konfiguriert – Uploads deaktiviert');
  if (!process.env.SESSION_SECRET) console.warn('[auth] SESSION_SECRET fehlt – abgeleiteter Schlüssel wird verwendet');
  app.listen(PORT, '0.0.0.0', () => console.log(`Mizax läuft auf Port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
