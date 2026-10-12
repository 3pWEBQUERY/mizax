import express from 'express';
import { query, hasDb } from '../db.js';
import { hasStorage, getObject } from '../storage.js';
import { httpError } from '../auth.js';
import { searchPlaces, nearestPlace } from '../places.js';
import { wrap, requireDb } from '../http.js';
import { listEscorts, loadPhotos, escortOut, cardOut, RATING_COLS } from '../escorts.js';

// Öffentliche API: Profile, Medien aus dem Bucket, Schweizer Orte

const router = express.Router();

router.get('/api/health', (req, res) => {
  res.json({ ok: true, db: hasDb(), storage: hasStorage() });
});

router.get(
  '/api/escorts',
  requireDb,
  wrap(async (req, res) => {
    const escorts = await listEscorts({ coversOnly: true });
    res.set('Cache-Control', 'private, max-age=0');
    res.json(escorts.map((e) => cardOut(e, { member: Boolean(req.user) })));
  }),
);

router.get(
  '/api/escorts/:slug',
  requireDb,
  wrap(async (req, res) => {
    const { rows } = await query(`SELECT *, ${RATING_COLS} FROM escorts WHERE slug = $1 AND published = true`, [
      req.params.slug,
    ]);
    if (!rows[0]) throw httpError(404, 'not_found', 'Profil nicht gefunden');
    const photos = await loadPhotos([rows[0].id]);
    const escort = escortOut(rows[0], photos.get(rows[0].id) || []);
    res.set('Cache-Control', 'private, max-age=0');
    res.json(req.user ? escort : cardOut(escort, { allPhotos: true }));
  }),
);

// Medien aus dem Railway Bucket ausliefern (Bucket ist privat)
router.get(
  /^\/media\/(.+)$/,
  wrap(async (req, res) => {
    const key = req.params[0];
    if (!/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.includes('..')) return res.status(400).end();
    // Nachweisfotos der Verifizierung sind nie öffentlich
    if (key.startsWith('private/')) return res.status(404).end();
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

// ---------- Schweizer Orte ----------

router.get('/api/places', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json(searchPlaces(String(req.query.q || '').slice(0, 60), Math.min(Number(req.query.limit) || 12, 30)));
});

router.get('/api/places/nearest', (req, res, next) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return next(httpError(400, 'invalid_location', 'Ungültiger Standort'));
  }
  // Der Standort wird nur für diese Abfrage verwendet und nicht gespeichert
  res.set('Cache-Control', 'no-store');
  res.json(nearestPlace(lat, lng));
});

export default router;
