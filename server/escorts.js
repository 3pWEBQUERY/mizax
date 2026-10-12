import { query } from './db.js';
import { httpError } from './auth.js';
import { slugify } from './seed.js';
import { findPlace } from './places.js';
import { hasStorage } from './storage.js';
import { storeImage, removeImages, photoOut, isImage } from './media.js';
import { cleanSchedule, isOpen } from '../src/lib/schedule.js';

// Datenebene der Escort-Profile: Serialisierung, Eingaben, Speichern, Fotos

export const MAX_PHOTOS = 20;

// erstes Foto eines Profils als Vorschaubild (für SQL-Abfragen mit Alias)
export const THUMB = (alias) =>
  `(SELECT key FROM escort_photos WHERE escort_id = ${alias}.id ORDER BY position, id LIMIT 1)`;
export const thumbUrl = (key) => (key ? `/media/${key}_sm.webp` : null);

// Durchschnitt und Anzahl der Bewertungen als zusätzliche Spalten (für SELECT … FROM escorts)
export const RATING_COLS = `
  (SELECT round(avg(rating)::numeric, 1) FROM escort_reviews WHERE escort_id = escorts.id)::float AS rating_avg,
  (SELECT count(*) FROM escort_reviews WHERE escort_id = escorts.id)::int AS rating_count`;

// aktives Abo-Paket als zusätzliche Spalten (für SELECT escorts.* … FROM escorts ${PLAN_JOIN})
export const PLAN_COLS = 'p.id AS plan_id, p.name AS plan_name, p.highlight AS plan_highlight, p.top AS plan_top';
export const PLAN_JOIN = `LEFT JOIN subscriptions sub ON sub.escort_id = escorts.id AND sub.period_end > now()
  LEFT JOIN plans p ON p.id = sub.plan_id`;

export async function ownEscort(userId) {
  const { rows } = await query('SELECT id, slug, name, published FROM escorts WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

// ---------- Serialisierung ----------

export function escortOut(row, photos = []) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    age: row.age,
    city: row.city,
    zip: row.zip,
    canton: row.canton,
    lat: row.lat,
    lng: row.lng,
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
    schedule: row.schedule ?? null,
    // Schalter „verfügbar“ und – falls angegeben – die Zeiten (Schweizer Zeit)
    availableNow: Boolean(row.available) && isOpen(row.schedule),
    featured: row.featured,
    published: row.published,
    sort: row.sort,
    userId: row.user_id,
    inbox: Boolean(row.user_id),
    rating: { average: row.rating_avg ?? null, count: row.rating_count ?? 0 },
    plan: row.plan_id ? { name: row.plan_name, highlight: row.plan_highlight, top: row.plan_top } : null,
    photos: photos.map(photoOut),
    full: true,
  };
}

// Für die Liste (Startseite, Favoriten, Vorschläge): nur was die Karten, Filter und Suche brauchen –
// das Vollprofil lädt die Profilseite selbst. Gäste sehen keine Leistungen und keine Zeiten.
export function cardOut(e, { member = false, allPhotos = false } = {}) {
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    age: e.age,
    city: e.city,
    zip: e.zip,
    canton: e.canton,
    lat: e.lat,
    lng: e.lng,
    accent: e.accent,
    verified: e.verified,
    available: e.available,
    availableNow: e.availableNow,
    ...(member ? { schedule: e.schedule } : {}),
    featured: e.featured,
    photos: allPhotos ? e.photos : e.photos.slice(0, 1),
    rating: e.rating,
    plan: e.plan,
    tagline: member ? e.tagline : '',
    services: member ? e.services : [],
    full: false,
  };
}

// nur das Titelbild je Profil (für Listen)
async function loadCovers(ids) {
  if (!ids.length) return new Map();
  const { rows } = await query(
    `SELECT DISTINCT ON (escort_id) * FROM escort_photos WHERE escort_id = ANY($1) ORDER BY escort_id, position, id`,
    [ids],
  );
  return new Map(rows.map((r) => [r.escort_id, [r]]));
}

export async function loadPhotos(ids) {
  if (!ids.length) return new Map();
  const { rows } = await query('SELECT * FROM escort_photos WHERE escort_id = ANY($1) ORDER BY position, id', [ids]);
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.escort_id)) map.set(r.escort_id, []);
    map.get(r.escort_id).push(r);
  }
  return map;
}

// Öffentliche Liste: Top-Pakete zuerst. requirePlan: nur Profile mit aktivem Abo
// (von der Verwaltung angelegte Profile ohne Konto sind ausgenommen).
export async function listEscorts({ includeUnpublished = false, coversOnly = false, requirePlan = false } = {}) {
  const where = [
    includeUnpublished ? null : 'escorts.published = true',
    requirePlan ? '(p.id IS NOT NULL OR escorts.user_id IS NULL)' : null,
  ].filter(Boolean);
  const { rows } = await query(
    `SELECT escorts.*, ${RATING_COLS}, ${PLAN_COLS} FROM escorts ${PLAN_JOIN}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY (p.top IS TRUE) DESC, escorts.created_at DESC, escorts.id DESC`,
  );
  const photos = coversOnly ? await loadCovers(rows.map((r) => r.id)) : await loadPhotos(rows.map((r) => r.id));
  return rows.map((r) => escortOut(r, photos.get(r.id) || []));
}

export async function getEscortById(id) {
  const { rows } = await query(
    `SELECT escorts.*, ${RATING_COLS}, ${PLAN_COLS} FROM escorts ${PLAN_JOIN} WHERE escorts.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const photos = await loadPhotos([id]);
  return escortOut(rows[0], photos.get(id) || []);
}

// ---------- Profil-Eingaben ----------

const toList = (v) =>
  (Array.isArray(v) ? v : String(v || '').split(','))
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 30);

export function escortInput(body) {
  const age = Number(body.age);
  if (!body.name || !String(body.name).trim()) throw httpError(400, 'name_required', 'Name fehlt');
  if (!Number.isInteger(age) || age < 18 || age > 99) {
    throw httpError(400, 'age_min', 'Alter muss mindestens 18 sein');
  }
  const rates = Array.isArray(body.rates)
    ? body.rates
        .filter((r) => r && (r.label || r.price))
        .slice(0, 20)
        .map((r) => ({
          label: String(r.label || '').slice(0, 60),
          price: String(r.price || '').slice(0, 40),
        }))
    : [];
  const str = (v, n = 200) =>
    String(v || '')
      .trim()
      .slice(0, n);
  // Ort immer serverseitig aus dem Schweizer Ortsverzeichnis auflösen (Kanton + Ortszentrum)
  const place = findPlace(body.zip, body.city);
  const schedule = cleanSchedule(body.schedule);
  return {
    name: str(body.name, 60),
    age,
    city: place ? place.name : str(body.city, 80),
    zip: place ? place.zip : '',
    canton: place ? place.canton : '',
    lat: place ? place.lat : null,
    lng: place ? place.lng : null,
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
    schedule: schedule ? JSON.stringify(schedule) : null,
    featured: Boolean(body.featured),
    published: body.published === undefined ? true : Boolean(body.published),
    sort: Number(body.sort) || 0,
  };
}

export const FIELDS = [
  'name',
  'age',
  'city',
  'zip',
  'canton',
  'lat',
  'lng',
  'tagline',
  'bio',
  'height',
  'nationality',
  'languages',
  'services',
  'rates',
  'phone',
  'whatsapp',
  'email',
  'accent',
  'verified',
  'available',
  'schedule',
  'featured',
  'published',
  'sort',
];
// Diese Felder darf nur die Verwaltung setzen
export const SELF_FIELDS = FIELDS.filter((f) => !['verified', 'featured', 'sort'].includes(f));

export async function uniqueSlug(base, excludeId = 0) {
  let slug = base || 'profil';
  for (let i = 2; ; i++) {
    const { rows } = await query('SELECT 1 FROM escorts WHERE slug = $1 AND id <> $2', [slug, excludeId]);
    if (!rows.length) return slug;
    slug = `${base}-${i}`;
  }
}

export async function insertEscort(data, extra = {}) {
  const slug = await uniqueSlug(slugify(`${data.name} ${data.city}`));
  const all = { ...data, ...extra, slug };
  const cols = Object.keys(all);
  const { rows } = await query(
    `INSERT INTO escorts (${cols.join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING id`,
    cols.map((c) => all[c]),
  );
  return rows[0].id;
}

// Für Vorschläge merken:
// - Standort geändert (moved_at)
// - wieder da (returned_at): von „nicht verfügbar“ auf „verfügbar“ gewechselt, oder das Profil wird
//   wieder veröffentlicht, nachdem es mindestens 7 Tage offline war (unpublished_at)
const PAUSE_MS = 7 * 24 * 3600 * 1000;

function events(old, data, fields) {
  const sets = [];
  const has = (k) => fields.includes(k);
  if ((has('zip') && data.zip !== old.zip) || (has('city') && data.city !== old.city)) sets.push('moved_at = now()');
  if (has('published') && old.published && !data.published) sets.push('unpublished_at = now()');
  const available = has('available') && old.available === false && data.available === true;
  const republished =
    has('published') &&
    !old.published &&
    data.published &&
    old.unpublished_at &&
    Date.now() - new Date(old.unpublished_at) >= PAUSE_MS;
  if (available || republished) sets.push('returned_at = now()');
  return sets;
}

export async function updateEscort(id, data, fields) {
  const { rows } = await query('SELECT zip, city, available, published, unpublished_at FROM escorts WHERE id = $1', [
    id,
  ]);
  if (!rows[0]) return false;
  const sets = [...fields.map((f, i) => `${f} = $${i + 2}`), ...events(rows[0], data, fields)].join(', ');
  const { rowCount } = await query(`UPDATE escorts SET ${sets}, updated_at = now() WHERE id = $1`, [
    id,
    ...fields.map((f) => data[f]),
  ]);
  return rowCount > 0;
}

// ---------- Fotos ----------

export async function savePhotos(escortId, files = [], limit = MAX_PHOTOS) {
  if (!hasStorage()) throw httpError(503, 'storage_unavailable', 'Bucket nicht verbunden');
  const { rows: maxRows } = await query(
    'SELECT COALESCE(MAX(position), -1)::int AS m, count(*)::int AS n FROM escort_photos WHERE escort_id = $1',
    [escortId],
  );
  const images = files.filter(isImage);
  if (maxRows[0].n + images.length > limit) {
    throw httpError(400, 'too_many_photos', `Maximal ${limit} Fotos pro Profil`);
  }
  let position = maxRows[0].m + 1;
  for (const file of images) {
    const img = await storeImage(file, `escorts/${escortId}`);
    await query('INSERT INTO escort_photos (escort_id, key, width, height, position) VALUES ($1,$2,$3,$4,$5)', [
      escortId,
      img.key,
      img.width,
      img.height,
      position++,
    ]);
  }
}

export async function reorderPhotos(escortId, ids) {
  for (let i = 0; i < ids.length; i++) {
    await query('UPDATE escort_photos SET position = $1 WHERE id = $2 AND escort_id = $3', [
      i,
      Number(ids[i]),
      escortId,
    ]);
  }
}

export async function deletePhoto(photoId, escortId = null) {
  const { rows } = await query(
    `DELETE FROM escort_photos WHERE id = $1 ${escortId ? 'AND escort_id = $2' : ''} RETURNING key, escort_id`,
    escortId ? [photoId, escortId] : [photoId],
  );
  if (!rows[0]) throw httpError(404, 'not_found', 'Nicht gefunden');
  await removeImages([rows[0].key]);
  return rows[0].escort_id;
}

export async function deleteEscort(id) {
  const { rows } = await query(
    `SELECT key FROM escort_photos WHERE escort_id = $1
     UNION ALL SELECT pp.key FROM post_photos pp JOIN posts p ON p.id = pp.post_id WHERE p.escort_id = $1
     UNION ALL SELECT photo_key FROM verifications WHERE escort_id = $1 AND photo_key IS NOT NULL
     UNION ALL SELECT m.photo_key FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE c.escort_id = $1 AND m.photo_key IS NOT NULL`,
    [id],
  );
  await query('DELETE FROM escorts WHERE id = $1', [id]);
  await removeImages(rows.map((r) => r.key));
}
