import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { CheckIcon, PlusIcon, SpinnerIcon } from '../../components/Icons.jsx';
import { api } from '../../lib/api.js';
import { useI18n, errorText } from '../../lib/i18n.jsx';
import { money, day } from '../Billing.jsx';
import { Switch } from '../settings/ui.jsx';

// Verwaltung: offene Rechnungen bestätigen, Pakete pflegen, Einstellungen, aktive Abos
export default function Billing({ onCount }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api('/api/admin/billing')
      .then(setData)
      .catch(() => setData({ error: true }));
  }, []);
  useEffect(load, [load]);

  async function invoice(inv, action) {
    if (action === 'paid' && !window.confirm(t('billingAdmin.confirmPaid', { number: inv.number }))) return;
    try {
      await api(`/api/admin/invoices/${inv.id}`, { method: 'POST', body: { action } });
      toast(t(`billingAdmin.done_${action}`));
      load();
      onCount?.();
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  async function saveSettings(patch) {
    try {
      const settings = await api('/api/admin/billing/settings', {
        method: 'PUT',
        body: { ...data.settings, ...patch },
      });
      setData((d) => ({ ...d, settings }));
      toast(t('billingAdmin.saved'));
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  if (!data) return <div className="panel empty">{t('admin.loading')}</div>;
  if (data.error) return <div className="panel empty">{t('errors.server_error')}</div>;

  return (
    <div className="admin-billing">
      {!data.configured && <div className="billing-note">{t('billingAdmin.ibanMissing')}</div>}

      <section className="panel">
        <div className="panel-title">
          <h2>{t('billingAdmin.open')}</h2>
          <span>{data.open.length}</span>
        </div>
        {data.open.length ? (
          data.open.map((i) => (
            <div key={i.id} className="invoice-row">
              <span className="invoice-main">
                <b>
                  {i.escort ? <Link to={`/escort/${i.escort.slug}`}>{i.escort.name}</Link> : '–'} · {i.planName}
                </b>
                <small>
                  {i.number} · {i.reference} · {t('billing.due')} {day(i.dueAt, locale)}
                </small>
              </span>
              <span className="invoice-amount">{money(i.amount, locale)}</span>
              <span className="invoice-actions">
                <button type="button" className="status-pill" onClick={() => invoice(i, 'cancel')}>
                  {t('billingAdmin.cancel')}
                </button>
                <button type="button" className="small-btn" onClick={() => invoice(i, 'paid')}>
                  <CheckIcon width={14} height={14} />
                  {t('billingAdmin.markPaid')}
                </button>
              </span>
            </div>
          ))
        ) : (
          <p className="panel-empty">{t('billingAdmin.noOpen')}</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{t('billingAdmin.plans')}</h2>
        </div>
        <div className="plan-editor">
          {data.plans.map((p) => (
            <PlanRow key={p.id} plan={p} onSaved={load} />
          ))}
          <PlanRow onSaved={load} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{t('billingAdmin.settings')}</h2>
        </div>
        <div className="billing-setting">
          <span>
            {t('billingAdmin.requirePlan')}
            <small>{t('billingAdmin.requirePlanHint')}</small>
          </span>
          <Switch
            on={data.settings.requirePlan}
            label={t('billingAdmin.requirePlan')}
            onChange={(requirePlan) => saveSettings({ requirePlan })}
          />
        </div>
        <div className="billing-setting">
          <span>
            {t('billingAdmin.freePhotos')}
            <small>{t('billingAdmin.freePhotosHint')}</small>
          </span>
          <select
            className="input billing-select"
            value={data.settings.freePhotos}
            onChange={(e) => saveSettings({ freePhotos: Number(e.target.value) })}
          >
            {Array.from({ length: 21 }, (_, n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{t('billingAdmin.subscriptions')}</h2>
          <span>{data.subscriptions.length}</span>
        </div>
        {data.subscriptions.length ? (
          data.subscriptions.map((s) => (
            <div key={s.escortId} className="invoice-row">
              <span className="invoice-main">
                <b>
                  <Link to={`/escort/${s.escort.slug}`}>{s.escort.name}</Link> · {s.planName}
                </b>
                <small>
                  {t('billingAdmin.until', { date: day(s.periodEnd, locale) })}
                  {!s.renew && ` · ${t('billingAdmin.renewOff')}`}
                </small>
              </span>
            </div>
          ))
        ) : (
          <p className="panel-empty">{t('billingAdmin.noSubs')}</p>
        )}
      </section>

      {data.recent.length > 0 && (
        <section className="panel">
          <div className="panel-title">
            <h2>{t('billingAdmin.recent')}</h2>
          </div>
          {data.recent.map((i) => (
            <div key={i.id} className="invoice-row">
              <span className="invoice-main">
                <b>
                  {i.escort?.name || '–'} · {i.planName}
                </b>
                <small>
                  {i.number} · {day(i.paidAt || i.createdAt, locale)}
                </small>
              </span>
              <span className="invoice-amount">{money(i.amount, locale)}</span>
              <span className={`invoice-status ${i.status}`}>{t(`billing.status_${i.status}`)}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

const EMPTY = { name: '', price: '', maxPhotos: 20, highlight: false, top: false, active: true, sort: 10 };

// Ein Paket bearbeiten (ohne plan: neues Paket anlegen)
function PlanRow({ plan, onSaved }) {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState(plan || EMPTY);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(plan || EMPTY);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(plan ? `/api/admin/plans/${plan.id}` : '/api/admin/plans', {
        method: plan ? 'PUT' : 'POST',
        body: { ...form, price: Number(String(form.price).replace(',', '.')) },
      });
      toast(t('billingAdmin.saved'));
      if (!plan) setForm(EMPTY);
      onSaved();
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`plan-row ${plan && !plan.active ? 'inactive' : ''}`} onSubmit={save}>
      <input
        className="input"
        value={form.name}
        maxLength={40}
        placeholder={plan ? '' : t('billingAdmin.newPlan')}
        aria-label={t('billingAdmin.name')}
        onChange={(e) => set('name', e.target.value)}
      />
      <label className="plan-price-field">
        <span>CHF</span>
        <input
          className="input"
          inputMode="decimal"
          value={form.price}
          aria-label={t('billingAdmin.price')}
          onChange={(e) => set('price', e.target.value)}
        />
      </label>
      <label className="plan-photos-field" title={t('billingAdmin.maxPhotos')}>
        <select
          className="input"
          value={form.maxPhotos}
          aria-label={t('billingAdmin.maxPhotos')}
          onChange={(e) => set('maxPhotos', Number(e.target.value))}
        >
          {Array.from({ length: 20 }, (_, n) => (
            <option key={n + 1} value={n + 1}>
              {t('billingAdmin.photosN', { n: n + 1 })}
            </option>
          ))}
        </select>
      </label>
      <div className="plan-toggles">
        {[
          ['highlight', t('billingAdmin.highlight')],
          ['top', t('billingAdmin.top')],
          ['active', t('billingAdmin.active')],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`toggle ${form[k] ? 'on' : ''}`}
            aria-pressed={form[k]}
            onClick={() => set(k, !form[k])}
          >
            {label}
          </button>
        ))}
      </div>
      <button type="submit" className="small-btn" disabled={busy || !dirty || !form.name || !form.price}>
        {busy ? <SpinnerIcon width={14} height={14} /> : plan ? null : <PlusIcon width={14} height={14} />}
        {plan ? t('billingAdmin.save') : t('billingAdmin.addPlan')}
      </button>
    </form>
  );
}
