import { useState } from 'react';
import { useToast } from './Toast.jsx';
import { TrashIcon, SpinnerIcon } from './Icons.jsx';
import NationalityField from './fields/NationalityField.jsx';
import LanguagesField from './fields/LanguagesField.jsx';
import PhoneField from './fields/PhoneField.jsx';
import PlaceField from './fields/PlaceField.jsx';
import ServicesPage, { ServicesField } from './fields/ServicesPage.jsx';
import PhotoManager, { MAX_PHOTOS } from './fields/PhotoManager.jsx';
import { api } from '../lib/api.js';
import { useT, errorText } from '../lib/i18n.jsx';

const empty = {
  name: '',
  age: 21,
  city: '',
  zip: '',
  canton: '',
  tagline: '',
  bio: '',
  height: '',
  nationality: '',
  languages: [],
  services: [],
  rates: [{ label: '', price: '' }],
  phone: '',
  whatsapp: '',
  email: '',
  accent: '#6d4aff',
  verified: false,
  available: true,
  featured: false,
  published: true,
  sort: 0,
};

function toForm(e, defaults) {
  if (!e) return { ...empty, ...defaults };
  return {
    ...empty,
    ...e,
    height: e.height || '',
    languages: e.languages || [],
    services: e.services || [],
    rates: e.rates?.length ? e.rates : [{ label: '', price: '' }],
  };
}

// Endpunkte für Verwaltung bzw. eigenes Profil
export const endpoints = {
  admin: {
    save: (e) =>
      e ? { method: 'PUT', path: `/api/admin/escorts/${e.id}` } : { method: 'POST', path: '/api/admin/escorts' },
    photos: (e) => `/api/admin/escorts/${e.id}/photos`,
    order: (e) => `/api/admin/escorts/${e.id}/photos/order`,
    deletePhoto: (id) => `/api/admin/photos/${id}`,
    remove: (e) => `/api/admin/escorts/${e.id}`,
  },
  self: {
    save: () => ({ method: 'PUT', path: '/api/me/profile' }),
    photos: () => '/api/me/profile/photos',
    order: () => '/api/me/profile/photos/order',
    deletePhoto: (id) => `/api/me/photos/${id}`,
    remove: null,
  },
};

// Maximal 20 Fotos pro Profil; hochgeladen wird in kleinen Paketen, damit auch viele große
// Handyfotos zuverlässig ankommen.

export default function ProfileEditor({
  escort,
  mode = 'admin',
  storage = true,
  defaults,
  onSaved,
  onDeleted,
  servicesOpen: servicesOpenProp,
  onOpenServices,
  onCloseServices,
}) {
  const t = useT();
  const toast = useToast();
  const ep = endpoints[mode];
  const [form, setForm] = useState(() => toForm(escort, defaults));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const flip = (k) => () => setForm((f) => ({ ...f, [k]: !f[k] }));
  const setValue = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // Leistungs-Seite: im eigenen Profil über die URL (/me/services), in der Verwaltung lokal
  const [servicesLocal, setServicesLocal] = useState(false);
  const servicesOpen = servicesOpenProp ?? servicesLocal;
  const openServices = onOpenServices || (() => setServicesLocal(true));
  const closeServices = onCloseServices || (() => setServicesLocal(false));

  async function persist(data) {
    setBusy(true);
    try {
      const body = { ...data, age: Number(data.age), height: data.height ? Number(data.height) : null };
      const { method, path } = ep.save(escort);
      const saved = await api(path, { method, body });
      toast(t('editor.saved'));
      await onSaved?.(saved);
      return true;
    } catch (err) {
      toast(errorText(t, err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function save(e) {
    e.preventDefault();
    persist(form);
  }

  async function saveServices(services) {
    const next = { ...form, services };
    setForm(next);
    if (await persist(next)) closeServices();
  }

  async function remove() {
    if (!escort || !ep.remove || !confirm(t('editor.confirmDelete', { name: escort.name }))) return;
    try {
      await api(ep.remove(escort), { method: 'DELETE' });
      toast(t('editor.deleted'));
      await onDeleted?.();
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  const setRate = (idx, key, val) =>
    setForm((f) => ({ ...f, rates: f.rates.map((r, i) => (i === idx ? { ...r, [key]: val } : r)) }));

  const toggles = [
    ['published', t('editor.published')],
    ['available', t('editor.available')],
    ...(mode === 'admin' ? [['verified', t('editor.verified')]] : []),
  ];

  return (
    <form onSubmit={save} className="editor">
      <Section title={t('editor.sectionBasics')}>
        <div className="form">
          <Field label={t('editor.name')}>
            <input className="input" value={form.name} onChange={set('name')} maxLength={60} required />
          </Field>
          <Field label={t('editor.age')}>
            <input className="input" type="number" min={18} max={99} value={form.age} onChange={set('age')} required />
          </Field>
          <Field label={t('editor.place')} full>
            <PlaceField
              city={form.city}
              zip={form.zip}
              canton={form.canton}
              onChange={(p) => setForm((f) => ({ ...f, ...p }))}
            />
          </Field>
          <Field label={t('editor.origin')}>
            <NationalityField value={form.nationality} onChange={setValue('nationality')} />
          </Field>
          <Field label={t('editor.height')}>
            <input className="input" type="number" value={form.height} onChange={set('height')} />
          </Field>
          <Field label={t('editor.accent')}>
            <label className="input color-field">
              <input type="color" value={form.accent} onChange={set('accent')} />
              <span>{form.accent.toUpperCase()}</span>
            </label>
          </Field>
        </div>
      </Section>

      <Section title={t('settings.about')}>
        <div className="form">
          <Field label={t('editor.tagline')} full>
            <input className="input" value={form.tagline} onChange={set('tagline')} maxLength={200} />
          </Field>
          <Field label={t('editor.bio')} full>
            <textarea className="input" value={form.bio} onChange={set('bio')} maxLength={5000} />
          </Field>
          <Field label={t('editor.languages')} full>
            <LanguagesField value={form.languages} onChange={setValue('languages')} />
          </Field>
          <Field label={t('editor.services')} full>
            <ServicesField value={form.services} onOpen={openServices} />
          </Field>
        </div>
      </Section>

      <Section title={t('editor.sectionContact')}>
        <div className="form">
          <Field label={t('editor.whatsapp')}>
            <PhoneField id="pf-whatsapp" whatsapp value={form.whatsapp} onChange={setValue('whatsapp')} />
          </Field>
          <Field label={t('editor.phone')}>
            <PhoneField id="pf-phone" value={form.phone} onChange={setValue('phone')} />
          </Field>
          <Field label={t('editor.email')}>
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </Field>
        </div>
      </Section>

      <Section title={t('editor.status')}>
        <div className="toggles">
          {toggles.map(([k, label]) => (
            <button
              type="button"
              key={k}
              className={`toggle ${form[k] ? 'on' : ''}`}
              onClick={flip(k)}
              aria-pressed={form[k]}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('editor.rates')}>
        {form.rates.map((r, idx) => (
          <div className="rate-row" key={idx}>
            <input
              className="input"
              placeholder={t('editor.rateLabel')}
              value={r.label}
              onChange={(e) => setRate(idx, 'label', e.target.value)}
            />
            <input
              className="input"
              placeholder={t('editor.ratePrice')}
              value={r.price}
              onChange={(e) => setRate(idx, 'price', e.target.value)}
            />
            <button
              type="button"
              className="rate-remove"
              onClick={() => setForm((f) => ({ ...f, rates: f.rates.filter((_, i) => i !== idx) }))}
              aria-label={t('editor.removeRow')}
            >
              <TrashIcon />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="toggle"
          onClick={() => setForm((f) => ({ ...f, rates: [...f.rates, { label: '', price: '' }] }))}
        >
          {t('editor.addRow')}
        </button>
      </Section>

      <Section
        title={t('editor.photos')}
        aside={escort ? t('editor.photoCount', { n: escort.photos.length, max: MAX_PHOTOS }) : null}
      >
        {escort ? (
          <PhotoManager escort={escort} storage={storage} ep={ep} onChange={onSaved} />
        ) : (
          <div className="field-empty">{t('editor.saveFirst')}</div>
        )}
      </Section>

      <div className="form-actions">
        {escort && ep.remove && (
          <button type="button" className="ghost-btn danger-btn" onClick={remove}>
            {t('editor.delete')}
          </button>
        )}
        {escort && (
          <a className="ghost-btn" href={`/escort/${escort.slug}`} target="_blank" rel="noreferrer">
            {t('editor.view')}
          </a>
        )}
        <button className="white-btn" disabled={busy}>
          {busy ? <SpinnerIcon /> : escort ? t('editor.save') : t('editor.create')}
        </button>
      </div>
      <ServicesPage open={servicesOpen} value={form.services} onSave={saveServices} onBack={closeServices} />
    </form>
  );
}

function Section({ title, aside, children }) {
  return (
    <section className="editor-section">
      <div className="panel-title">
        <h2>{title}</h2>
        {aside && <span>{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, full, children }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}
