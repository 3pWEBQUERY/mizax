import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Page from '../components/Page.jsx';
import PageHead from '../components/PageHead.jsx';
import { Rise } from '../components/Bubble.jsx';
import { useToast } from '../components/Toast.jsx';
import { CheckIcon, ChevronR, SpinnerIcon } from '../components/Icons.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { Group, Switch } from './settings/ui.jsx';
import { useI18n, errorText } from '../lib/i18n.jsx';

// Schweizer Schreibweise: „CHF 99“ bzw. „CHF 99.50“
export const money = (n, locale) =>
  `CHF ${new Intl.NumberFormat(locale, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n)}`;
export const day = (d, locale) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(d));

// Vorteile eines Pakets als Liste
export function PlanFeatures({ plan }) {
  const { t } = useI18n();
  return (
    <ul className="plan-features">
      <li>
        <CheckIcon width={14} height={14} />
        {t('billing.photos', { n: plan.maxPhotos })}
      </li>
      {plan.highlight && (
        <li>
          <CheckIcon width={14} height={14} />
          {t('billing.highlight')}
        </li>
      )}
      {plan.top && (
        <li>
          <CheckIcon width={14} height={14} />
          {t('billing.top')}
        </li>
      )}
    </ul>
  );
}

// „Abo“: Pakete mit Monatslaufzeit wählen, offene QR-Rechnung, Rechnungsverlauf
export default function Billing() {
  useDock({ mode: 'hidden' });
  const { t, locale } = useI18n();
  const { user, ready } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (user?.role !== 'escort') return;
    api('/api/me/billing')
      .then(setData)
      .catch((err) => setData({ error: err }));
  }, [user]);

  async function run(key, request, message) {
    setBusy(key);
    try {
      setData(await request());
      if (message) toast(message);
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(null);
    }
  }

  if (ready && !user) return <Navigate to="/login" replace state={{ from: '/me/abo' }} />;
  if (user && user.role !== 'escort') return <Navigate to="/settings" replace />;

  const sub = data?.subscription;
  const active = sub?.active;
  const open = data?.invoices?.find((i) => i.status === 'open');

  return (
    <Page className="billing-page">
      <PageHead title={t('billing.title')} text={t('billing.intro')}>
        {data && !data.error && (
          <span className={`status-pill ${active ? 'on' : ''}`}>
            <span className={`dot ${active ? '' : 'off'}`} />
            {active ? t('billing.pill', { plan: sub.name, date: day(sub.periodEnd, locale) }) : t('billing.none')}
          </span>
        )}
      </PageHead>

      {!data ? (
        <div className="skeleton" style={{ height: 240, aspectRatio: 'auto', borderRadius: 22 }} />
      ) : data.error ? (
        <Rise i={2} className="panel stats-empty">
          <p>{errorText(t, data.error)}</p>
          <Link to="/me" className="small-btn">
            {t('menu.myProfile')}
            <ChevronR width={14} height={14} />
          </Link>
        </Rise>
      ) : (
        <>
          {data.settings.requirePlan && !active && (
            <Rise i={2} className="billing-note">
              {t('billing.requireNotice')}
            </Rise>
          )}

          <div className="plan-grid">
            {data.plans.map((p, idx) => {
              const current = active && sub.planId === p.id;
              const pending = open?.planId === p.id;
              return (
                <Rise key={p.id} i={3 + idx} className={`panel plan-card ${current ? 'current' : ''}`}>
                  <div className="plan-head">
                    <h2>{p.name}</h2>
                    {current && <span className="status-pill on">{t('billing.currentPlan')}</span>}
                  </div>
                  <div className="plan-price">
                    <b>{money(p.price, locale)}</b>
                    <span>{t('billing.perMonth')}</span>
                  </div>
                  <PlanFeatures plan={p} />
                  <button
                    type="button"
                    className={current || pending ? 'ghost-btn' : 'white-btn'}
                    disabled={Boolean(busy) || pending}
                    onClick={() =>
                      run(
                        `plan-${p.id}`,
                        () => api('/api/me/billing/order', { method: 'POST', body: { planId: p.id } }),
                        t('billing.ordered'),
                      )
                    }
                  >
                    {busy === `plan-${p.id}` ? (
                      <SpinnerIcon />
                    ) : pending ? (
                      t('billing.awaiting')
                    ) : current ? (
                      t('billing.extend')
                    ) : active ? (
                      t('billing.switchPlan')
                    ) : (
                      t('billing.choose')
                    )}
                  </button>
                </Rise>
              );
            })}
          </div>

          <AnimatePresence>
            {open && (
              <motion.section
                key={open.id}
                className="panel invoice-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <div className="panel-title">
                  <h2>{t('billing.openInvoice')}</h2>
                  <span>{t('billing.invoiceNo', { number: open.number })}</span>
                </div>
                <div className="invoice-body">
                  <dl className="invoice-facts">
                    <div>
                      <dt>{t('billing.package')}</dt>
                      <dd>{open.planName}</dd>
                    </div>
                    <div>
                      <dt>{t('billing.amount')}</dt>
                      <dd>{money(open.amount, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t('billing.due')}</dt>
                      <dd>{day(open.dueAt, locale)}</dd>
                    </div>
                    {data.payee && (
                      <>
                        <div>
                          <dt>{t('billing.payTo')}</dt>
                          <dd>
                            {data.payee.name}
                            <br />
                            {data.payee.address && (
                              <>
                                {data.payee.address}
                                <br />
                              </>
                            )}
                            {data.payee.place}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('billing.iban')}</dt>
                          <dd className="mono">{data.payee.iban.replace(/(.{4})/g, '$1 ').trim()}</dd>
                        </div>
                        <div>
                          <dt>{t('billing.reference')}</dt>
                          <dd className="mono">{open.reference}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  {data.payee ? (
                    <figure className="invoice-qr">
                      <img src={`/api/billing/invoices/${open.id}/qr.svg`} alt={t('billing.qrAlt')} />
                      <figcaption>{t('billing.qrHint')}</figcaption>
                    </figure>
                  ) : (
                    <p className="billing-note">{t('billing.noPayee')}</p>
                  )}
                </div>
                <div className="invoice-actions">
                  <a
                    className="status-pill"
                    href={`/api/billing/invoices/${open.id}/qr.svg`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('billing.openQr')}
                  </a>
                  <button
                    type="button"
                    className="status-pill"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      run(
                        'cancel',
                        () => api(`/api/me/billing/invoices/${open.id}`, { method: 'DELETE' }),
                        t('billing.cancelled'),
                      )
                    }
                  >
                    {t('billing.cancelInvoice')}
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {sub && (
            <Rise i={7} className="billing-renew">
              <Group>
                <div className="settings-row static no-icon">
                  <span className="settings-label">
                    {t('billing.renew')}
                    <small>{t('billing.renewHint')}</small>
                  </span>
                  <Switch
                    on={sub.renew}
                    label={t('billing.renew')}
                    onChange={(renew) =>
                      !busy && run('renew', () => api('/api/me/billing/renew', { method: 'PUT', body: { renew } }))
                    }
                  />
                </div>
              </Group>
            </Rise>
          )}

          <Rise i={8} className="panel invoice-history">
            <div className="panel-title">
              <h2>{t('billing.history')}</h2>
              {!active && <span>{t('billing.freeNotice', { n: data.settings.freePhotos })}</span>}
            </div>
            {data.invoices.length ? (
              data.invoices.map((i) => (
                <div key={i.id} className="invoice-row">
                  <span className="invoice-main">
                    <b>{i.planName}</b>
                    <small>
                      {i.number} · {day(i.createdAt, locale)}
                    </small>
                  </span>
                  <span className="invoice-amount">{money(i.amount, locale)}</span>
                  <span className={`invoice-status ${i.status}`}>{t(`billing.status_${i.status}`)}</span>
                </div>
              ))
            ) : (
              <p className="panel-empty">{t('billing.empty')}</p>
            )}
          </Rise>
        </>
      )}
    </Page>
  );
}
