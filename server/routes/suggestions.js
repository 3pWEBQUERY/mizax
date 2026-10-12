import express from 'express';
import { query } from '../db.js';
import { httpError, requireUser } from '../auth.js';
import { wrap, requireDb, noStore } from '../http.js';
import { getMember } from '../members.js';
import { prefsOut, prefsInput, getPrefs, savePrefs, buildSuggestions } from '../suggestions.js';

// Präferenzen und Vorschläge für Mitglieder

const router = express.Router();

function membersOnly(req, res, next) {
  if (req.user.role === 'escort') return next(httpError(403, 'members_only', 'Nur für Mitglieder'));
  next();
}

router.get(
  '/api/me/prefs',
  requireUser,
  requireDb,
  membersOnly,
  wrap(async (req, res) => {
    noStore(res);
    res.json(prefsOut(await getPrefs(req.user.id), await getMember(req.user.id)));
  }),
);

router.put(
  '/api/me/prefs',
  requireUser,
  requireDb,
  membersOnly,
  wrap(async (req, res) => {
    res.json(prefsOut(await savePrefs(req.user.id, prefsInput(req.body || {}))));
  }),
);

router.get(
  '/api/me/suggestions',
  requireUser,
  requireDb,
  membersOnly,
  wrap(async (req, res) => {
    noStore(res);
    const prefs = await getPrefs(req.user.id);
    if (!prefs?.enabled) return res.json({ enabled: false });
    res.json({ enabled: true, ...(await buildSuggestions(prefs)) });
  }),
);

router.post(
  '/api/me/suggestions/seen',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    await query('UPDATE member_prefs SET seen_at = now() WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  }),
);

export default router;
