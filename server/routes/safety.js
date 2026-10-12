import express from 'express';
import { query } from '../db.js';
import { httpError, requireUser, requireAdmin, rateLimit } from '../auth.js';
import { wrap, requireDb, noStore, text, toId } from '../http.js';
import { thumbUrl, THUMB } from '../escorts.js';
import { removeImages } from '../media.js';
import { REPORT_KINDS, REPORT_REASONS, reportTarget, removeTarget } from '../safety.js';

// Melden (an die Verwaltung) und Blockieren

const router = express.Router();

// ---------- Melden ----------

router.post(
  '/api/reports',
  requireUser,
  requireDb,
  rateLimit(30, 60 * 60 * 1000),
  wrap(async (req, res) => {
    const kind = String(req.body?.kind || '');
    const reason = String(req.body?.reason || '');
    const targetId = toId(req.body?.targetId);
    if (!REPORT_KINDS.includes(kind) || !REPORT_REASONS.includes(reason)) {
      throw httpError(400, 'report_invalid', 'Ungültige Meldung');
    }
    const target = await reportTarget(kind, targetId);
    if (!target) throw httpError(404, 'not_found', 'Nicht gefunden');
    if (target.userId === req.user.id) throw httpError(400, 'report_own', 'Eigene Inhalte kann man nicht melden');
    // dieselbe offene Meldung nur einmal pro Person
    await query(
      `INSERT INTO reports (reporter_id, kind, target_id, reason, details) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (reporter_id, kind, target_id) WHERE status = 'open' DO NOTHING`,
      [req.user.id, kind, targetId, reason, text(req.body?.details, 1000)],
    );
    res.status(201).json({ ok: true });
  }),
);

// ---------- Blockieren ----------

async function blockList(userId) {
  const { rows } = await query(
    `SELECT b.blocked_id AS id, b.created_at, u.name, u.role, u.avatar_key, e.slug, e.name AS escort_name,
       ${THUMB('e')} AS thumb_key
     FROM blocks b JOIN users u ON u.id = b.blocked_id
     LEFT JOIN escorts e ON e.user_id = u.id
     WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
    [userId],
  );
  return rows.map((r) =>
    r.slug
      ? { id: r.id, kind: 'escort', slug: r.slug, name: r.escort_name, thumb: thumbUrl(r.thumb_key), at: r.created_at }
      : { id: r.id, kind: 'member', memberId: r.id, name: r.name, thumb: thumbUrl(r.avatar_key), at: r.created_at },
  );
}

router.get(
  '/api/me/blocks',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    noStore(res);
    res.json(await blockList(req.user.id));
  }),
);

router.put(
  '/api/blocks/:userId',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    const other = toId(req.params.userId);
    if (other === req.user.id) throw httpError(400, 'block_self', 'Man kann sich nicht selbst blockieren');
    const { rows } = await query('SELECT is_admin FROM users WHERE id = $1', [other]);
    if (!rows[0]) throw httpError(404, 'not_found', 'Nicht gefunden');
    if (rows[0].is_admin) throw httpError(400, 'block_admin', 'Die Verwaltung kann nicht blockiert werden');
    await query('INSERT INTO blocks (user_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
      req.user.id,
      other,
    ]);
    res.json(await blockList(req.user.id));
  }),
);

router.delete(
  '/api/blocks/:userId',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    await query('DELETE FROM blocks WHERE user_id = $1 AND blocked_id = $2', [req.user.id, toId(req.params.userId)]);
    res.json(await blockList(req.user.id));
  }),
);

// ---------- Verwaltung: Meldungen ----------

router.get(
  '/api/admin/reports',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const status = req.query.status === 'done' ? 'done' : 'open';
    const { rows } = await query(
      `SELECT r.kind, r.target_id, count(*)::int AS count, max(r.created_at) AS last_at,
         array_agg(DISTINCT r.reason) AS reasons,
         json_agg(json_build_object('id', r.id, 'reason', r.reason, 'details', r.details, 'at', r.created_at,
           'reporter', u.name, 'reporterId', r.reporter_id) ORDER BY r.created_at DESC) AS items
       FROM reports r LEFT JOIN users u ON u.id = r.reporter_id
       WHERE ${status === 'open' ? "r.status = 'open'" : "r.status <> 'open'"}
       GROUP BY r.kind, r.target_id ORDER BY last_at DESC LIMIT 200`,
    );
    const out = [];
    for (const g of rows) {
      out.push({
        kind: g.kind,
        targetId: g.target_id,
        count: g.count,
        reasons: g.reasons,
        lastAt: g.last_at,
        items: g.items.slice(0, 10),
        target: await reportTarget(g.kind, g.target_id),
      });
    }
    noStore(res);
    res.json(out);
  }),
);

router.get(
  '/api/admin/reports/count',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const { rows } = await query(
      "SELECT count(DISTINCT (kind, target_id))::int AS n FROM reports WHERE status = 'open'",
    );
    noStore(res);
    res.json({ count: rows[0].n });
  }),
);

// Alle offenen Meldungen zu einem Ziel erledigen: ok (erledigt), dismiss (verworfen), remove (Inhalt löschen),
// hide (Escort-Profil ausblenden)
router.post(
  '/api/admin/reports/:kind/:targetId',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const kind = String(req.params.kind);
    const targetId = toId(req.params.targetId);
    const action = String(req.body?.action || '');
    if (!REPORT_KINDS.includes(kind) || !['ok', 'dismiss', 'remove', 'hide'].includes(action)) {
      throw httpError(400, 'report_invalid', 'Ungültige Aktion');
    }
    if (action === 'remove') {
      const keys = await removeTarget(kind, targetId);
      if (keys === false) throw httpError(400, 'report_invalid', 'Dieser Inhalt kann nicht gelöscht werden');
      await removeImages(keys);
    }
    if (action === 'hide') {
      if (kind !== 'escort') throw httpError(400, 'report_invalid', 'Nur Escort-Profile können ausgeblendet werden');
      await query('UPDATE escorts SET published = false WHERE id = $1', [targetId]);
    }
    await query(
      `UPDATE reports SET status = $1, resolved_at = now(), resolved_by = $2
       WHERE kind = $3 AND target_id = $4 AND status = 'open'`,
      [action === 'dismiss' ? 'dismissed' : 'resolved', req.user.id, kind, targetId],
    );
    res.json({ ok: true });
  }),
);

export default router;
