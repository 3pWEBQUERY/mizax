import express from 'express';
import { query, hasDb } from '../db.js';
import { hasStorage } from '../storage.js';
import { requireAdmin, httpError } from '../auth.js';
import { wrap, requireDb, uploadImages, MAX_UPLOAD_FILES } from '../http.js';
import {
  escortInput,
  listEscorts,
  getEscortById,
  insertEscort,
  updateEscort,
  deleteEscort,
  savePhotos,
  reorderPhotos,
  deletePhoto,
  FIELDS,
} from '../escorts.js';

// Verwaltung (nur Admins)

const router = express.Router();

// ---------- Admin API ----------

router.get('/api/admin/status', requireAdmin, (req, res) => {
  res.json({ ok: true, db: hasDb(), storage: hasStorage() });
});

router.get(
  '/api/admin/escorts',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    res.json(await listEscorts({ includeUnpublished: true }));
  }),
);

router.get(
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

router.put(
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

router.post(
  '/api/admin/escorts',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const data = escortInput(req.body || {});
    const id = await insertEscort(Object.fromEntries(FIELDS.map((f) => [f, data[f]])));
    res.status(201).json(await getEscortById(id));
  }),
);

router.put(
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

router.delete(
  '/api/admin/escorts/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    await deleteEscort(Number(req.params.id));
    res.json({ ok: true });
  }),
);

router.post(
  '/api/admin/escorts/:id/photos',
  requireAdmin,
  requireDb,
  uploadImages(MAX_UPLOAD_FILES),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await getEscortById(id))) throw httpError(404, 'not_found', 'Nicht gefunden');
    await savePhotos(id, req.files);
    res.json(await getEscortById(id));
  }),
);

router.put(
  '/api/admin/escorts/:id/photos/order',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    await reorderPhotos(id, Array.isArray(req.body?.ids) ? req.body.ids : []);
    res.json(await getEscortById(id));
  }),
);

router.delete(
  '/api/admin/photos/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const escortId = await deletePhoto(Number(req.params.id));
    res.json(await getEscortById(escortId));
  }),
);

export default router;
