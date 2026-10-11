import express from 'express';
import { query } from '../db.js';
import { httpError, requireUser, userOut } from '../auth.js';
import { wrap, requireDb, noStore, toId, uploadImages } from '../http.js';
import { hasStorage } from '../storage.js';
import { storeImage, removeImages, isImage } from '../media.js';
import { ownEscort } from '../escorts.js';
import { memberInput, memberOut, getMember, updateMember } from '../members.js';

// Mitgliederprofile: eigenes Profil bearbeiten und Profile ansehen
// (sichtbar für Escorts, die Verwaltung und das Mitglied selbst)

const router = express.Router();

// ---------- eigenes Profil ----------

router.get(
  '/api/me/member',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    noStore(res);
    res.json(memberOut(await getMember(req.user.id)));
  }),
);

router.put(
  '/api/me/member',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    const row = await updateMember(req.user.id, memberInput(req.body || {}));
    res.json({ member: memberOut(row), user: userOut(row) });
  }),
);

router.post(
  '/api/me/member/avatar',
  requireUser,
  requireDb,
  uploadImages(1),
  wrap(async (req, res) => {
    if (!hasStorage()) throw httpError(503, 'storage_unavailable', 'Bucket nicht verbunden');
    const file = (req.files || []).find(isImage);
    if (!file) throw httpError(400, 'invalid_image', 'Kein Bild');
    const img = await storeImage(file, `members/${req.user.id}`);
    const old = (await getMember(req.user.id))?.avatar_key;
    const { rows } = await query('UPDATE users SET avatar_key = $1 WHERE id = $2 RETURNING *', [img.key, req.user.id]);
    if (old) await removeImages([old]);
    res.json({ member: memberOut(rows[0]), user: userOut(rows[0]) });
  }),
);

router.delete(
  '/api/me/member/avatar',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    const old = (await getMember(req.user.id))?.avatar_key;
    const { rows } = await query('UPDATE users SET avatar_key = NULL WHERE id = $1 RETURNING *', [req.user.id]);
    if (old) await removeImages([old]);
    res.json({ member: memberOut(rows[0]), user: userOut(rows[0]) });
  }),
);

// ---------- Profile ansehen ----------

router.get(
  '/api/members/:id',
  requireUser,
  wrap(async (req, res) => {
    const memberId = toId(req.params.id);
    const self = memberId === req.user.id;
    if (!self && req.user.role !== 'escort' && !req.user.is_admin)
      throw httpError(403, 'forbidden', 'Keine Berechtigung');
    const { rows } = await query(
      `SELECT u.*, e.slug AS escort_slug FROM users u LEFT JOIN escorts e ON e.user_id = u.id WHERE u.id = $1`,
      [memberId],
    );
    const m = rows[0];
    if (!m) throw httpError(404, 'not_found', 'Nicht gefunden');
    let conversationId = null;
    if (!self) {
      const own = await ownEscort(req.user.id);
      if (own) {
        const { rows: c } = await query('SELECT id FROM conversations WHERE user_id = $1 AND escort_id = $2', [
          memberId,
          own.id,
        ]);
        conversationId = c[0]?.id || null;
      }
    }
    noStore(res);
    res.json({ ...memberOut(m), escortSlug: m.escort_slug || null, conversationId, self });
  }),
);

router.post(
  '/api/members/:id/view',
  requireUser,
  wrap(async (req, res) => {
    const memberId = toId(req.params.id);
    if (memberId !== req.user.id && req.user.role === 'escort') {
      await query(
        `INSERT INTO member_views (member_id, viewer_id)
         SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM users WHERE id = $1 AND role = 'member')
           AND NOT EXISTS (
             SELECT 1 FROM member_views
             WHERE member_id = $1 AND viewer_id = $2 AND created_at > now() - interval '30 minutes'
           )`,
        [memberId, req.user.id],
      );
    }
    res.json({ ok: true });
  }),
);

export default router;
