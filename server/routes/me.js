import express from 'express';
import { query } from '../db.js';
import { requireUser, requireEscort, httpError } from '../auth.js';
import { wrap } from '../http.js';
import { uploadImages, MAX_UPLOAD_FILES } from '../http.js';
import {
  escortInput,
  getEscortById,
  insertEscort,
  updateEscort,
  savePhotos,
  reorderPhotos,
  deletePhoto,
  SELF_FIELDS,
} from '../escorts.js';

// Favoriten und das eigene Escort-Profil

const router = express.Router();

// ---------- Favoriten ----------

router.get(
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

router.put(
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

router.delete(
  '/api/me/favorites/:slug',
  requireUser,
  wrap(async (req, res) => {
    await query('DELETE FROM favorites WHERE user_id = $1 AND escort_id = (SELECT id FROM escorts WHERE slug = $2)', [
      req.user.id,
      req.params.slug,
    ]);
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

router.get(
  '/api/me/profile',
  requireEscort,
  wrap(async (req, res) => {
    const id = await ownEscortId(req.user.id);
    res.set('Cache-Control', 'private, no-store');
    res.json(id ? await getEscortById(id) : null);
  }),
);

router.put(
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

router.post(
  '/api/me/profile/photos',
  requireEscort,
  uploadImages(MAX_UPLOAD_FILES),
  wrap(async (req, res) => {
    const id = await requireOwnEscort(req);
    await savePhotos(id, req.files);
    res.json(await getEscortById(id));
  }),
);

router.put(
  '/api/me/profile/photos/order',
  requireEscort,
  wrap(async (req, res) => {
    const id = await requireOwnEscort(req);
    await reorderPhotos(id, Array.isArray(req.body?.ids) ? req.body.ids : []);
    res.json(await getEscortById(id));
  }),
);

router.delete(
  '/api/me/photos/:id',
  requireEscort,
  wrap(async (req, res) => {
    const id = await requireOwnEscort(req);
    await deletePhoto(Number(req.params.id), id);
    res.json(await getEscortById(id));
  }),
);

export default router;
