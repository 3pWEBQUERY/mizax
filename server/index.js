import express from 'express';
import compression from 'compression';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { query, migrate, hasDb } from './db.js';
import { hasStorage, putObject, getObject, deleteObject } from './storage.js';
import { seedIfEmpty, slugify } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(compression());
app.use(express.json({ limit: '1mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 12 },
});

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
    photos: photos.map(photoOut),
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

async function listEscorts({ includeUnpublished = false, q = '', city = '' } = {}) {
  const where = [];
  const params = [];
  if (!includeUnpublished) where.push('published = true');
  if (q) {
    params.push(`%${q}%`);
    where.push(`(name ILIKE $${params.length} OR city ILIKE $${params.length} OR tagline ILIKE $${params.length})`);
  }
  if (city) {
    params.push(city);
    where.push(`city = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT * FROM escorts ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY featured DESC, sort ASC, created_at DESC`,
    params,
  );
  const photos = await loadPhotos(rows.map((r) => r.id));
  return rows.map((r) => escortOut(r, photos.get(r.id) || []));
}

// ---------- Admin-Auth (stateless HMAC-Token) ----------

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`mizax:${ADMIN_PASSWORD}`).digest('hex');

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function issueToken() {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const payload = `admin.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token = '') {
  const idx = token.lastIndexOf('.');
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const exp = Number(payload.split('.')[1]);
  return Number.isFinite(exp) && exp > Date.now();
}

function requireAdmin(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!ADMIN_PASSWORD || !verifyToken(token)) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }
  next();
}

function requireDb(req, res, next) {
  if (!hasDb()) return res.status(503).json({ error: 'Datenbank nicht verbunden (DATABASE_URL fehlt)' });
  next();
}

// ---------- Öffentliche API ----------

app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: hasDb(), storage: hasStorage() });
});

app.get(
  '/api/escorts',
  requireDb,
  wrap(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const city = String(req.query.city || '').trim().slice(0, 80);
    const escorts = await listEscorts({ q, city });
    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    res.json(escorts);
  }),
);

app.get(
  '/api/cities',
  requireDb,
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT city, count(*)::int AS n FROM escorts WHERE published = true AND city <> ''
       GROUP BY city ORDER BY n DESC, city`,
    );
    res.json(rows);
  }),
);

app.get(
  '/api/escorts/:slug',
  requireDb,
  wrap(async (req, res) => {
    const { rows } = await query('SELECT * FROM escorts WHERE slug = $1 AND published = true', [
      req.params.slug,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Profil nicht gefunden' });
    const photos = await loadPhotos([rows[0].id]);
    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    res.json(escortOut(rows[0], photos.get(rows[0].id) || []));
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

// ---------- Admin API ----------

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'ADMIN_PASSWORD ist auf dem Server nicht gesetzt' });
  }
  const pw = String(req.body?.password || '');
  const a = crypto.createHash('sha256').update(pw).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Falsches Passwort' });
  res.json({ token: issueToken() });
});

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

const toList = (v) =>
  Array.isArray(v)
    ? v.map((s) => String(s).trim()).filter(Boolean)
    : String(v || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

function escortInput(body) {
  const age = Number(body.age);
  if (!body.name || !String(body.name).trim()) throw Object.assign(new Error('Name fehlt'), { status: 400 });
  if (!Number.isInteger(age) || age < 18) {
    throw Object.assign(new Error('Alter muss mindestens 18 sein'), { status: 400 });
  }
  const rates = Array.isArray(body.rates)
    ? body.rates
        .filter((r) => r && (r.label || r.price))
        .map((r) => ({ label: String(r.label || ''), price: String(r.price || '') }))
    : [];
  return {
    name: String(body.name).trim(),
    age,
    city: String(body.city || '').trim(),
    tagline: String(body.tagline || '').trim(),
    bio: String(body.bio || '').trim(),
    height: body.height ? Number(body.height) || null : null,
    nationality: String(body.nationality || '').trim(),
    languages: toList(body.languages),
    services: toList(body.services),
    rates: JSON.stringify(rates),
    phone: String(body.phone || '').trim(),
    whatsapp: String(body.whatsapp || '').trim(),
    email: String(body.email || '').trim(),
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

async function uniqueSlug(base, excludeId = 0) {
  let slug = base || 'profil';
  for (let i = 2; ; i++) {
    const { rows } = await query('SELECT 1 FROM escorts WHERE slug = $1 AND id <> $2', [slug, excludeId]);
    if (!rows.length) return slug;
    slug = `${base}-${i}`;
  }
}

async function getEscortById(id) {
  const { rows } = await query('SELECT * FROM escorts WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const photos = await loadPhotos([id]);
  return escortOut(rows[0], photos.get(id) || []);
}

app.post(
  '/api/admin/escorts',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const data = escortInput(req.body);
    const slug = await uniqueSlug(slugify(`${data.name} ${data.city}`));
    const cols = ['slug', ...FIELDS];
    const vals = [slug, ...FIELDS.map((f) => data[f])];
    const { rows } = await query(
      `INSERT INTO escorts (${cols.join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING id`,
      vals,
    );
    res.status(201).json(await getEscortById(rows[0].id));
  }),
);

app.put(
  '/api/admin/escorts/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const data = escortInput(req.body);
    const sets = FIELDS.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const { rowCount } = await query(
      `UPDATE escorts SET ${sets}, updated_at = now() WHERE id = $1`,
      [id, ...FIELDS.map((f) => data[f])],
    );
    if (!rowCount) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(await getEscortById(id));
  }),
);

app.delete(
  '/api/admin/escorts/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const { rows } = await query('SELECT key FROM escort_photos WHERE escort_id = $1', [id]);
    await query('DELETE FROM escorts WHERE id = $1', [id]);
    await Promise.allSettled(
      rows.flatMap((r) => [deleteObject(`${r.key}.webp`), deleteObject(`${r.key}_sm.webp`)]),
    );
    res.json({ ok: true });
  }),
);

app.post(
  '/api/admin/escorts/:id/photos',
  requireAdmin,
  requireDb,
  upload.array('photos', 12),
  wrap(async (req, res) => {
    if (!hasStorage()) {
      return res.status(503).json({ error: 'Railway Bucket ist nicht verbunden' });
    }
    const id = Number(req.params.id);
    const { rows: exists } = await query('SELECT 1 FROM escorts WHERE id = $1', [id]);
    if (!exists.length) return res.status(404).json({ error: 'Nicht gefunden' });
    const { rows: maxRows } = await query(
      'SELECT COALESCE(MAX(position), -1)::int AS m FROM escort_photos WHERE escort_id = $1',
      [id],
    );
    let position = maxRows[0].m + 1;

    for (const file of req.files || []) {
      if (!/^image\//.test(file.mimetype)) continue;
      const base = sharp(file.buffer, { failOn: 'none' }).rotate();
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
      const key = `escorts/${id}/${crypto.randomUUID()}`;
      await putObject(`${key}.webp`, large.data, 'image/webp');
      await putObject(`${key}_sm.webp`, small, 'image/webp');
      await query(
        'INSERT INTO escort_photos (escort_id, key, width, height, position) VALUES ($1,$2,$3,$4,$5)',
        [id, key, large.info.width, large.info.height, position++],
      );
    }
    res.json(await getEscortById(id));
  }),
);

app.put(
  '/api/admin/escorts/:id/photos/order',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : [];
    for (let i = 0; i < ids.length; i++) {
      await query('UPDATE escort_photos SET position = $1 WHERE id = $2 AND escort_id = $3', [i, ids[i], id]);
    }
    res.json(await getEscortById(id));
  }),
);

app.delete(
  '/api/admin/photos/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const { rows } = await query('DELETE FROM escort_photos WHERE id = $1 RETURNING key, escort_id', [
      Number(req.params.id),
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Nicht gefunden' });
    await Promise.allSettled([deleteObject(`${rows[0].key}.webp`), deleteObject(`${rows[0].key}_sm.webp`)]);
    res.json(await getEscortById(rows[0].escort_id));
  }),
);

app.use('/api', (req, res) => res.status(404).json({ error: 'Nicht gefunden' }));

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
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Serverfehler' : err.message });
});

async function start() {
  if (hasDb()) {
    for (let attempt = 1; ; attempt++) {
      try {
        await migrate();
        await seedIfEmpty();
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
  if (!ADMIN_PASSWORD) console.warn('[admin] ADMIN_PASSWORD fehlt – Admin-Bereich deaktiviert');
  app.listen(PORT, '0.0.0.0', () => console.log(`Mizax läuft auf Port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
