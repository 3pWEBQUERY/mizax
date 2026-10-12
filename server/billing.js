import { SwissQRBill } from 'swissqrbill/svg';
import { calculateQRReferenceChecksum, calculateSCORReferenceChecksum, isIBANValid, isQRIBAN } from 'swissqrbill/utils';
import { query } from './db.js';
import { httpError } from './auth.js';
import { sendTemplate, appUrl } from './mail/index.js';

// Abos mit Monatslaufzeit. Bezahlt wird per Schweizer QR-Rechnung; die Verwaltung bestätigt den
// Zahlungseingang, danach läuft das Paket einen Monat (bei Verlängerung ab dem bisherigen Ende).
// Eine Kartenzahlung (z. B. Segpay, Verotel) kann später als weitere Zahlart angeschlossen werden.

export const MAX_PHOTOS = 20;
const PAYMENT_DAYS = 10;
const RENEW_DAYS = 7;

// ---------- Einstellungen (app_meta) ----------

const DEFAULTS = { requirePlan: false, freePhotos: MAX_PHOTOS };

export async function getSettings() {
  const { rows } = await query(
    `SELECT key, value FROM app_meta WHERE key IN ('billing.requirePlan', 'billing.freePhotos')`,
  );
  const m = Object.fromEntries(rows.map((r) => [r.key.slice(8), r.value]));
  return {
    requirePlan: m.requirePlan ? m.requirePlan === 'true' : DEFAULTS.requirePlan,
    freePhotos: m.freePhotos ? Number(m.freePhotos) : DEFAULTS.freePhotos,
  };
}

export async function saveSettings({ requirePlan, freePhotos }) {
  const free = Math.max(0, Math.min(MAX_PHOTOS, Number(freePhotos) || 0));
  for (const [k, v] of [
    ['billing.requirePlan', String(Boolean(requirePlan))],
    ['billing.freePhotos', String(free)],
  ]) {
    await query('INSERT INTO app_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [k, v]);
  }
  return getSettings();
}

// ---------- Rechnungssteller (Railway-Variablen) ----------

export function creditor() {
  const env = process.env;
  const account = String(env.BILLING_IBAN || '').replace(/\s/g, '');
  if (!account || !env.BILLING_NAME || !env.BILLING_ZIP || !env.BILLING_CITY || !isIBANValid(account)) return null;
  return {
    account,
    name: env.BILLING_NAME,
    address: env.BILLING_STREET || '',
    buildingNumber: env.BILLING_HOUSE || undefined,
    zip: env.BILLING_ZIP,
    city: env.BILLING_CITY,
    country: env.BILLING_COUNTRY || 'CH',
  };
}

// Referenz passend zur IBAN: QR-IBAN → QR-Referenz (27 Ziffern), sonst Creditor Reference (RF…)
function referenceFor(invoiceId) {
  const c = creditor();
  if (c && isQRIBAN(c.account)) {
    const base = String(invoiceId).padStart(26, '0');
    return base + calculateQRReferenceChecksum(base);
  }
  const body = `MZ${String(invoiceId).padStart(8, '0')}`;
  return `RF${calculateSCORReferenceChecksum(body)}${body}`;
}

export function qrBillSvg(invoice, language = 'DE') {
  const c = creditor();
  if (!c) return null;
  const bill = new SwissQRBill(
    {
      amount: Number(invoice.amount),
      currency: invoice.currency,
      creditor: c,
      reference: invoice.reference || undefined,
      message: `Mizax ${invoice.plan_name} – ${invoice.number}`,
    },
    { language },
  );
  return bill.toString();
}

// ---------- Pakete ----------

export const planOut = (p) => ({
  id: p.id,
  name: p.name,
  price: Number(p.price),
  maxPhotos: p.max_photos,
  highlight: p.highlight,
  top: p.top,
  active: p.active,
  sort: p.sort,
});

export async function listPlans({ all = false } = {}) {
  const { rows } = await query(`SELECT * FROM plans ${all ? '' : 'WHERE active'} ORDER BY sort, price, id`);
  return rows.map(planOut);
}

export function planInput(body) {
  const name = String(body.name || '')
    .trim()
    .slice(0, 40);
  const price = Math.round(Number(body.price) * 100) / 100;
  if (!name) throw httpError(400, 'plan_invalid', 'Name fehlt');
  if (!Number.isFinite(price) || price <= 0 || price > 10000) throw httpError(400, 'plan_invalid', 'Ungültiger Preis');
  return {
    name,
    price,
    max_photos: Math.max(1, Math.min(MAX_PHOTOS, Number(body.maxPhotos) || MAX_PHOTOS)),
    highlight: Boolean(body.highlight),
    top: Boolean(body.top),
    active: body.active === undefined ? true : Boolean(body.active),
    sort: Number(body.sort) || 0,
  };
}

// Startpakete beim ersten Start (Preise in der Verwaltung änderbar)
export async function seedPlans() {
  const { rows } = await query('SELECT count(*)::int AS n FROM plans');
  if (rows[0].n) return;
  const plans = [
    ['Basic', 49, 8, false, false, 1],
    ['Premium', 99, 20, true, false, 2],
    ['Top', 149, 20, true, true, 3],
  ];
  for (const p of plans) {
    await query('INSERT INTO plans (name, price, max_photos, highlight, top, sort) VALUES ($1,$2,$3,$4,$5,$6)', p);
  }
}

// ---------- Abo eines Profils ----------

export async function subscriptionOf(escortId) {
  const { rows } = await query(
    `SELECT s.*, p.name, p.price, p.max_photos, p.highlight, p.top, p.active AS plan_active,
       s.period_end > now() AS running
     FROM subscriptions s LEFT JOIN plans p ON p.id = s.plan_id WHERE s.escort_id = $1`,
    [escortId],
  );
  const s = rows[0];
  if (!s) return null;
  return {
    planId: s.plan_id,
    name: s.name,
    periodEnd: s.period_end,
    active: Boolean(s.running && s.plan_id),
    renew: s.renew,
    maxPhotos: s.max_photos,
    highlight: s.highlight,
    top: s.top,
  };
}

// Fotolimit: Paket oder – ohne Abo – die Einstellung „Fotos ohne Abo“
export async function photoLimit(escortId) {
  const sub = await subscriptionOf(escortId);
  if (sub?.active) return sub.maxPhotos;
  return (await getSettings()).freePhotos;
}

// ---------- Rechnungen ----------

export const invoiceOut = (i) => ({
  id: i.id,
  number: i.number,
  planId: i.plan_id,
  planName: i.plan_name,
  amount: Number(i.amount),
  currency: i.currency,
  reference: i.reference,
  kind: i.kind,
  status: i.status,
  dueAt: i.due_at,
  paidAt: i.paid_at,
  createdAt: i.created_at,
});

const fmtDate = (d, locale) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Europe/Zurich' }).format(new Date(d));
const fmtAmount = (n) => `CHF ${Number(n).toFixed(2)}`;

async function owner(escortId) {
  const { rows } = await query(
    'SELECT u.id, u.email, u.name, u.locale FROM escorts e JOIN users u ON u.id = e.user_id WHERE e.id = $1',
    [escortId],
  );
  return rows[0] || null;
}

export async function createInvoice(escortId, planId, kind = 'new', req = null) {
  const { rows: plans } = await query('SELECT * FROM plans WHERE id = $1 AND active', [planId]);
  const plan = plans[0];
  if (!plan) throw httpError(400, 'plan_invalid', 'Paket nicht verfügbar');
  // pro Profil höchstens eine offene Rechnung: eine andere wird ersetzt
  const { rows: open } = await query(`SELECT * FROM invoices WHERE escort_id = $1 AND status = 'open'`, [escortId]);
  if (open[0]?.plan_id === plan.id) return invoiceOut(open[0]);
  await query(`UPDATE invoices SET status = 'cancelled' WHERE escort_id = $1 AND status = 'open'`, [escortId]);

  const user = await owner(escortId);
  const { rows } = await query(
    `INSERT INTO invoices (escort_id, user_id, plan_id, plan_name, amount, kind, due_at)
     VALUES ($1, $2, $3, $4, $5, $6, now() + interval '${PAYMENT_DAYS} days') RETURNING id`,
    [escortId, user?.id || null, plan.id, plan.name, plan.price, kind],
  );
  const id = rows[0].id;
  const number = `MZ-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`;
  const { rows: saved } = await query('UPDATE invoices SET number = $2, reference = $3 WHERE id = $1 RETURNING *', [
    id,
    number,
    referenceFor(id),
  ]);
  const inv = saved[0];
  if (user) {
    sendTemplate(
      user,
      kind === 'renewal' ? 'invoiceRenew' : 'invoice',
      { plan: plan.name, amount: fmtAmount(plan.price), due: fmtDate(inv.due_at, user.locale), number },
      `${appUrl(req)}/me/abo`,
    ).catch(() => {});
  }
  return invoiceOut(inv);
}

// Zahlung bestätigt: Abo um einen Monat verlängern (gleiches Paket ab bisherigem Ende, sonst ab jetzt)
export async function markPaid(invoiceId, req = null) {
  const { rows } = await query(
    `UPDATE invoices SET status = 'paid', paid_at = now() WHERE id = $1 AND status = 'open' RETURNING *`,
    [invoiceId],
  );
  const inv = rows[0];
  if (!inv) throw httpError(404, 'not_found', 'Rechnung nicht gefunden');
  if (!inv.escort_id) return invoiceOut(inv);
  const { rows: subs } = await query(
    `INSERT INTO subscriptions (escort_id, plan_id, period_end)
     VALUES ($1, $2, now() + interval '1 month')
     ON CONFLICT (escort_id) DO UPDATE SET
       period_end = CASE WHEN subscriptions.plan_id = EXCLUDED.plan_id AND subscriptions.period_end > now()
                         THEN subscriptions.period_end + interval '1 month'
                         ELSE now() + interval '1 month' END,
       plan_id = EXCLUDED.plan_id, updated_at = now()
     RETURNING period_end`,
    [inv.escort_id, inv.plan_id],
  );
  const user = await owner(inv.escort_id);
  if (user) {
    sendTemplate(
      user,
      'planActive',
      { plan: inv.plan_name, until: fmtDate(subs[0].period_end, user.locale) },
      `${appUrl(req)}/me/abo`,
    ).catch(() => {});
  }
  return invoiceOut(inv);
}

// Regelmässig: Verlängerungs-Rechnungen 7 Tage vor Ablauf, Hinweis bei Ablauf
export async function billingJob() {
  const { rows: due } = await query(
    `SELECT s.escort_id, s.plan_id FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id AND p.active
     WHERE s.renew AND s.period_end > now() AND s.period_end < now() + interval '${RENEW_DAYS} days'
       AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.escort_id = s.escort_id AND i.status = 'open')
       AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.escort_id = s.escort_id AND i.kind = 'renewal'
                       AND i.created_at > s.period_end - interval '${RENEW_DAYS + 3} days')`,
  );
  for (const s of due) await createInvoice(s.escort_id, s.plan_id, 'renewal').catch(() => {});

  const { rows: expired } = await query(
    `SELECT s.escort_id, s.period_end, p.name FROM subscriptions s LEFT JOIN plans p ON p.id = s.plan_id
     WHERE s.period_end < now() AND s.period_end > now() - interval '3 days'`,
  );
  for (const s of expired) {
    const user = await owner(s.escort_id);
    if (!user) continue;
    const ref = new Date(s.period_end).toISOString();
    const { rows: sent } = await query(
      `SELECT 1 FROM notify_log WHERE user_id = $1 AND kind = 'plan_expired' AND ref = $2`,
      [user.id, ref],
    );
    if (sent.length) continue;
    await query(`INSERT INTO notify_log (user_id, kind, ref) VALUES ($1, 'plan_expired', $2)`, [user.id, ref]);
    sendTemplate(user, 'planExpired', { plan: s.name || 'Mizax' }, `${appUrl()}/me/abo`).catch(() => {});
  }
}

export function startBilling() {
  const run = () => billingJob().catch((err) => console.error('[billing]', err.message));
  setInterval(run, 60 * 60 * 1000).unref();
  setTimeout(run, 45 * 1000).unref();
}
