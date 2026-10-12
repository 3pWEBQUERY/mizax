import express from 'express';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { getObject } from '../storage.js';
import { requireAdmin, requireEscort, httpError } from '../auth.js';
import { wrap, requireDb, noStore, text, toId, uploadImages } from '../http.js';
import { storeImage, removeImages, isImage, photoOut } from '../media.js';
import { sendTemplate, appUrl } from '../mail/index.js';

// Verifizierung: Die Escort lädt ein Selfie hoch, auf dem ein Zettel mit ihrem persönlichen Code
// zu sehen ist. Das Foto liegt unter private/ (nie über /media erreichbar), nur die Verwaltung
// sieht es, und nach dem Entscheid wird es gelöscht.

const router = express.Router();

const newCode = () => `MZ-${crypto.randomInt(1000, 10000)}`;

async function ownEscort(userId) {
  const { rows } = await query(
    `SELECT e.id, e.verified, e.verify_code, (SELECT count(*)::int FROM escort_photos p WHERE p.escort_id = e.id) AS photos
     FROM escorts e WHERE e.user_id = $1`,
    [userId],
  );
  if (!rows[0]) throw httpError(404, 'profile_missing', 'Bitte speichere zuerst dein Profil');
  return rows[0];
}

async function stateOf(escort) {
  let code = escort.verify_code;
  if (!code && !escort.verified) {
    code = newCode();
    await query('UPDATE escorts SET verify_code = $2 WHERE id = $1', [escort.id, code]);
  }
  const { rows } = await query(
    'SELECT status, reason, created_at, decided_at FROM verifications WHERE escort_id = $1 ORDER BY id DESC LIMIT 1',
    [escort.id],
  );
  const last = rows[0];
  let status = 'none';
  if (escort.verified) status = 'verified';
  else if (last?.status === 'pending') status = 'pending';
  else if (last?.status === 'rejected') status = 'rejected';
  return {
    status,
    code: escort.verified ? null : code,
    reason: status === 'rejected' ? last.reason : '',
    submittedAt: last?.created_at || null,
    decidedAt: last?.decided_at || null,
    hasPhotos: escort.photos > 0,
  };
}

async function dropPending(escortId) {
  const { rows } = await query(
    `DELETE FROM verifications WHERE escort_id = $1 AND status = 'pending' RETURNING photo_key`,
    [escortId],
  );
  await removeImages(rows.map((r) => r.photo_key).filter(Boolean));
}

// ---------- Escort ----------

router.get(
  '/api/me/verification',
  requireEscort,
  requireDb,
  wrap(async (req, res) => {
    noStore(res);
    res.json(await stateOf(await ownEscort(req.user.id)));
  }),
);

router.post(
  '/api/me/verification',
  requireEscort,
  requireDb,
  uploadImages(1),
  wrap(async (req, res) => {
    const escort = await ownEscort(req.user.id);
    if (escort.verified) throw httpError(400, 'already_verified', 'Profil ist bereits verifiziert');
    if (!escort.photos) throw httpError(400, 'verify_needs_photos', 'Bitte lade zuerst Profilfotos hoch');
    const file = (req.files || [])[0];
    if (!file || !isImage(file)) throw httpError(400, 'upload_invalid', 'Bitte ein Foto hochladen');
    const state = await stateOf(escort);
    const img = await storeImage(file, 'private/verify');
    await dropPending(escort.id);
    await query('INSERT INTO verifications (escort_id, code, photo_key) VALUES ($1, $2, $3)', [
      escort.id,
      state.code,
      img.key,
    ]);
    res.json(await stateOf(escort));
  }),
);

router.delete(
  '/api/me/verification',
  requireEscort,
  requireDb,
  wrap(async (req, res) => {
    const escort = await ownEscort(req.user.id);
    await dropPending(escort.id);
    res.json(await stateOf(escort));
  }),
);

// ---------- Verwaltung ----------

router.get(
  '/api/admin/verifications/count',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    noStore(res);
    const { rows } = await query(`SELECT count(*)::int AS n FROM verifications WHERE status = 'pending'`);
    res.json({ count: rows[0].n });
  }),
);

router.get(
  '/api/admin/verifications',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    noStore(res);
    const pending = req.query.status !== 'done';
    const { rows } = await query(
      `SELECT v.id, v.code, v.status, v.reason, v.created_at, v.decided_at, v.photo_key,
              e.id AS escort_id, e.slug, e.name, e.age, e.city, e.published, u.name AS decided_by_name
       FROM verifications v
       JOIN escorts e ON e.id = v.escort_id
       LEFT JOIN users u ON u.id = v.decided_by
       WHERE ${pending ? `v.status = 'pending'` : `v.status <> 'pending'`}
       ORDER BY ${pending ? 'v.created_at ASC' : 'v.decided_at DESC'} LIMIT 200`,
    );
    const ids = rows.map((r) => r.escort_id);
    const photos = new Map();
    if (ids.length) {
      const p = await query(
        `SELECT id, escort_id, key, width, height FROM escort_photos
         WHERE escort_id = ANY($1) ORDER BY escort_id, position, id`,
        [ids],
      );
      for (const ph of p.rows) {
        const list = photos.get(ph.escort_id) || [];
        if (list.length < 4) list.push(photoOut(ph));
        photos.set(ph.escort_id, list);
      }
    }
    res.json(
      rows.map((r) => ({
        id: r.id,
        code: r.code,
        status: r.status,
        reason: r.reason,
        createdAt: r.created_at,
        decidedAt: r.decided_at,
        decidedBy: r.decided_by_name,
        photo: r.photo_key ? `/api/admin/verifications/${r.id}/photo` : null,
        escort: {
          id: r.escort_id,
          slug: r.slug,
          name: r.name,
          age: r.age,
          city: r.city,
          published: r.published,
          photos: photos.get(r.escort_id) || [],
        },
      })),
    );
  }),
);

// Nachweisfoto nur für Admins und ohne Zwischenspeicher ausliefern
router.get(
  '/api/admin/verifications/:id/photo',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const { rows } = await query('SELECT photo_key FROM verifications WHERE id = $1', [toId(req.params.id)]);
    if (!rows[0]?.photo_key) throw httpError(404, 'not_found', 'Nicht gefunden');
    const obj = await getObject(`${rows[0].photo_key}.webp`);
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'private, no-store');
    obj.Body.pipe(res);
  }),
);

router.post(
  '/api/admin/verifications/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const id = toId(req.params.id);
    const approve = req.body?.action === 'approve';
    const reason = approve ? '' : text(req.body?.reason, 500);
    const before = await query(`SELECT photo_key FROM verifications WHERE id = $1 AND status = 'pending'`, [id]);
    const { rows } = await query(
      `UPDATE verifications SET status = $2, reason = $3, decided_at = now(), decided_by = $4, photo_key = NULL
       WHERE id = $1 AND status = 'pending' RETURNING escort_id`,
      [id, approve ? 'approved' : 'rejected', reason, req.user.id],
    );
    if (!rows[0]) throw httpError(404, 'not_found', 'Nicht gefunden');
    const escortId = rows[0].escort_id;
    if (before.rows[0]?.photo_key) await removeImages([before.rows[0].photo_key]);
    // nach jedem Entscheid gibt es einen neuen Code, damit ein altes Foto nicht wiederverwendet wird
    await query('UPDATE escorts SET verify_code = NULL, verified = verified OR $2 WHERE id = $1', [escortId, approve]);

    const owner = await query(
      `SELECT u.id, u.email, u.name, u.locale FROM escorts e JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
      [escortId],
    );
    if (owner.rows[0]) {
      sendTemplate(
        owner.rows[0],
        approve ? 'verifyOk' : 'verifyNo',
        { reason: reason || '–' },
        `${appUrl(req)}/me`,
      ).catch(() => {});
    }
    res.json({ ok: true });
  }),
);

export default router;
