import express from 'express';
import { query } from '../db.js';
import { requireAdmin, requireEscort, requireUser, httpError } from '../auth.js';
import { wrap, requireDb, noStore, toId } from '../http.js';
import { ownEscort } from '../escorts.js';
import {
  listPlans,
  planInput,
  planOut,
  subscriptionOf,
  getSettings,
  saveSettings,
  creditor,
  createInvoice,
  markPaid,
  invoiceOut,
  qrBillSvg,
  photoLimit,
} from '../billing.js';

// Abos: Pakete wählen, Rechnungen (QR-Rechnung), Verwaltung bestätigt Zahlungen

const router = express.Router();

async function myEscort(req) {
  const e = await ownEscort(req.user.id);
  if (!e) throw httpError(404, 'profile_missing', 'Bitte speichere zuerst dein Profil');
  return e;
}

async function billingState(escortId) {
  const [plans, subscription, settings, { rows }] = await Promise.all([
    listPlans(),
    subscriptionOf(escortId),
    getSettings(),
    query('SELECT * FROM invoices WHERE escort_id = $1 ORDER BY created_at DESC LIMIT 24', [escortId]),
  ]);
  const c = creditor();
  return {
    plans,
    subscription,
    settings,
    photoLimit: await photoLimit(escortId),
    invoices: rows.map(invoiceOut),
    payee: c
      ? {
          name: c.name,
          iban: c.account,
          address: [c.address, c.buildingNumber].filter(Boolean).join(' '),
          place: `${c.zip} ${c.city}`,
        }
      : null,
  };
}

// ---------- Escort ----------

router.get(
  '/api/me/billing',
  requireEscort,
  requireDb,
  wrap(async (req, res) => {
    noStore(res);
    res.json(await billingState((await myEscort(req)).id));
  }),
);

router.post(
  '/api/me/billing/order',
  requireEscort,
  requireDb,
  wrap(async (req, res) => {
    const e = await myEscort(req);
    await createInvoice(e.id, toId(req.body?.planId), 'new', req);
    res.json(await billingState(e.id));
  }),
);

router.put(
  '/api/me/billing/renew',
  requireEscort,
  requireDb,
  wrap(async (req, res) => {
    const e = await myEscort(req);
    await query('UPDATE subscriptions SET renew = $2 WHERE escort_id = $1', [e.id, Boolean(req.body?.renew)]);
    res.json(await billingState(e.id));
  }),
);

router.delete(
  '/api/me/billing/invoices/:id',
  requireEscort,
  requireDb,
  wrap(async (req, res) => {
    const e = await myEscort(req);
    await query(`UPDATE invoices SET status = 'cancelled' WHERE id = $1 AND escort_id = $2 AND status = 'open'`, [
      toId(req.params.id),
      e.id,
    ]);
    res.json(await billingState(e.id));
  }),
);

// QR-Rechnung als SVG – für die Escort selbst und für Admins
router.get(
  '/api/billing/invoices/:id/qr.svg',
  requireUser,
  requireDb,
  wrap(async (req, res) => {
    const { rows } = await query(
      'SELECT i.*, e.user_id AS owner FROM invoices i LEFT JOIN escorts e ON e.id = i.escort_id WHERE i.id = $1',
      [toId(req.params.id)],
    );
    const inv = rows[0];
    if (!inv || (inv.owner !== req.user.id && !req.user.is_admin)) throw httpError(404, 'not_found', 'Nicht gefunden');
    const lang = { de: 'DE', fr: 'FR', en: 'EN' }[req.user.locale] || 'DE';
    const svg = qrBillSvg(inv, lang);
    if (!svg) throw httpError(404, 'billing_unconfigured', 'Rechnungsdaten fehlen');
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(svg);
  }),
);

// ---------- Verwaltung ----------

router.get(
  '/api/admin/billing',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    noStore(res);
    const [plans, settings, open, recent, subs] = await Promise.all([
      listPlans({ all: true }),
      getSettings(),
      query(
        `SELECT i.*, e.name AS escort_name, e.slug FROM invoices i LEFT JOIN escorts e ON e.id = i.escort_id
         WHERE i.status = 'open' ORDER BY i.created_at`,
      ),
      query(
        `SELECT i.*, e.name AS escort_name, e.slug FROM invoices i LEFT JOIN escorts e ON e.id = i.escort_id
         WHERE i.status <> 'open' ORDER BY i.created_at DESC LIMIT 50`,
      ),
      query(
        `SELECT s.escort_id, s.period_end, s.renew, p.name AS plan_name, e.name AS escort_name, e.slug
         FROM subscriptions s JOIN escorts e ON e.id = s.escort_id LEFT JOIN plans p ON p.id = s.plan_id
         WHERE s.period_end > now() ORDER BY s.period_end`,
      ),
    ]);
    const withEscort = (i) => ({ ...invoiceOut(i), escort: i.slug ? { name: i.escort_name, slug: i.slug } : null });
    res.json({
      plans,
      settings,
      configured: Boolean(creditor()),
      open: open.rows.map(withEscort),
      recent: recent.rows.map(withEscort),
      subscriptions: subs.rows.map((s) => ({
        escortId: s.escort_id,
        escort: { name: s.escort_name, slug: s.slug },
        planName: s.plan_name,
        periodEnd: s.period_end,
        renew: s.renew,
      })),
    });
  }),
);

router.get(
  '/api/admin/billing/count',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    noStore(res);
    const { rows } = await query(`SELECT count(*)::int AS n FROM invoices WHERE status = 'open'`);
    res.json({ count: rows[0].n });
  }),
);

router.post(
  '/api/admin/plans',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const p = planInput(req.body || {});
    const { rows } = await query(
      `INSERT INTO plans (name, price, max_photos, highlight, top, active, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [p.name, p.price, p.max_photos, p.highlight, p.top, p.active, p.sort],
    );
    res.status(201).json(planOut(rows[0]));
  }),
);

router.put(
  '/api/admin/plans/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const p = planInput(req.body || {});
    const { rows } = await query(
      `UPDATE plans SET name=$2, price=$3, max_photos=$4, highlight=$5, top=$6, active=$7, sort=$8
       WHERE id = $1 RETURNING *`,
      [toId(req.params.id), p.name, p.price, p.max_photos, p.highlight, p.top, p.active, p.sort],
    );
    if (!rows[0]) throw httpError(404, 'not_found', 'Paket nicht gefunden');
    res.json(planOut(rows[0]));
  }),
);

router.put(
  '/api/admin/billing/settings',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    res.json(await saveSettings(req.body || {}));
  }),
);

router.post(
  '/api/admin/invoices/:id',
  requireAdmin,
  requireDb,
  wrap(async (req, res) => {
    const id = toId(req.params.id);
    if (req.body?.action === 'paid') return res.json(await markPaid(id, req));
    const { rows } = await query(
      `UPDATE invoices SET status = 'cancelled' WHERE id = $1 AND status = 'open' RETURNING *`,
      [id],
    );
    if (!rows[0]) throw httpError(404, 'not_found', 'Rechnung nicht gefunden');
    res.json(invoiceOut(rows[0]));
  }),
);

export default router;
