import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useToast } from './Toast.jsx';
import { ChevronL, ChevronR, TrashIcon, SpinnerIcon } from './Icons.jsx';
import NationalityField from './fields/NationalityField.jsx';
import LanguagesField from './fields/LanguagesField.jsx';
import PhoneField from './fields/PhoneField.jsx';
import ServicesPage, { ServicesField } from './fields/ServicesPage.jsx';
import { api } from '../lib/api.js';
import { useT, errorText } from '../lib/i18n.jsx';

const empty = {
  name: '',
  age: 21,
  city: '',
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
    save: (e) => (e ? { method: 'PUT', path: `/api/admin/escorts/${e.id}` } : { method: 'POST', path: '/api/admin/escorts' }),
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
export const MAX_PHOTOS = 20;
const BATCH = 4;

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
    <form onSubmit={save}>
      <div className="form">
        <Field label={t('editor.name')}>
          <input className="input" value={form.name} onChange={set('name')} maxLength={60} required />
        </Field>
        <Field label={t('editor.age')}>
          <input className="input" type="number" min={18} max={99} value={form.age} onChange={set('age')} required />
        </Field>
        <Field label={t('editor.city')}>
          <input className="input" value={form.city} onChange={set('city')} />
        </Field>
        <Field label={t('editor.origin')}>
          <NationalityField value={form.nationality} onChange={setValue('nationality')} />
        </Field>
        <Field label={t('editor.height')}>
          <input className="input" type="number" value={form.height} onChange={set('height')} />
        </Field>
        <Field label={t('editor.accent')}>
          <input className="input" type="color" value={form.accent} onChange={set('accent')} style={{ height: 46, padding: 6 }} />
        </Field>
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

      <div className="section-title">{t('editor.status')}</div>
      <div className="toggles">
        {toggles.map(([k, label]) => (
          <button type="button" key={k} className={`toggle ${form[k] ? 'on' : ''}`} onClick={flip(k)} aria-pressed={form[k]}>
            {label}
          </button>
        ))}
      </div>

      <div className="section-title">{t('editor.rates')}</div>
      {form.rates.map((r, idx) => (
        <div className="rate-row" key={idx}>
          <input className="input" placeholder={t('editor.rateLabel')} value={r.label} onChange={(e) => setRate(idx, 'label', e.target.value)} />
          <input className="input" placeholder={t('editor.ratePrice')} value={r.price} onChange={(e) => setRate(idx, 'price', e.target.value)} />
          <button
            type="button"
            className="mini-btn danger"
            style={{ width: 40, height: 46, borderRadius: 14 }}
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

      <div className="section-title">
        {t('editor.photos')}
        {escort && (
          <span style={{ color: 'var(--muted)', fontWeight: 500, marginLeft: 8 }}>
            {t('editor.photoCount', { n: escort.photos.length, max: MAX_PHOTOS })}
          </span>
        )}
      </div>
      {escort ? (
        <Photos escort={escort} storage={storage} ep={ep} onChange={onSaved} />
      ) : (
        <div style={{ color: 'var(--muted)' }}>{t('editor.saveFirst')}</div>
      )}

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

function Field({ label, full, children }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function Photos({ escort, storage, ep, onChange }) {
  const t = useT();
  const toast = useToast();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null); // { done, total } während des Uploads
  const [over, setOver] = useState(false);
  const busy = Boolean(progress);
  const free = MAX_PHOTOS - escort.photos.length;

  async function upload(files) {
    let imgs = [...files].filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    if (imgs.length > free) {
      toast(t('errors.too_many_photos'));
      imgs = imgs.slice(0, Math.max(free, 0));
      if (!imgs.length) return;
    }
    let done = 0;
    setProgress({ done, total: imgs.length });
    try {
      let saved = null;
      for (let i = 0; i < imgs.length; i += BATCH) {
        const form = new FormData();
        imgs.slice(i, i + BATCH).forEach((f) => form.append('photos', f));
        saved = await api(ep.photos(escort), { method: 'POST', form });
        done = Math.min(i + BATCH, imgs.length);
        setProgress({ done, total: imgs.length });
        await onChange?.(saved);
      }
      toast(t('editor.uploaded', { n: imgs.length }));
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setProgress(null);
    }
  }

  async function move(idx, dir) {
    const ids = escort.photos.map((p) => p.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    try {
      const saved = await api(ep.order(escort), { method: 'PUT', body: { ids } });
      await onChange?.(saved);
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  async function del(id) {
    try {
      const saved = await api(ep.deletePhoto(id), { method: 'DELETE' });
      await onChange?.(saved);
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  return (
    <div className="photo-grid">
      {escort.photos.map((p, idx) => (
        <motion.div layout key={p.id} className="photo-item">
          <img src={p.thumb} alt="" />
          {idx === 0 && (
            <span className="badge light" style={{ position: 'absolute', top: 6, left: 6, fontSize: 11 }}>
              {t('editor.cover')}
            </span>
          )}
          <div className="photo-actions">
            <button type="button" className="mini-btn" onClick={() => move(idx, -1)} aria-label={t('editor.moveLeft')}>
              <ChevronL width={16} height={16} />
            </button>
            <button type="button" className="mini-btn danger" onClick={() => del(p.id)} aria-label={t('editor.deletePhoto')}>
              <TrashIcon />
            </button>
            <button type="button" className="mini-btn" onClick={() => move(idx, 1)} aria-label={t('editor.moveRight')}>
              <ChevronR width={16} height={16} />
            </button>
          </div>
        </motion.div>
      ))}
      {free > 0 && (
        <button
          type="button"
          className={`dropzone ${over ? 'over' : ''}`}
          disabled={busy || !storage}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            upload(e.dataTransfer.files);
          }}
        >
          {busy ? (
            <span style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
              <SpinnerIcon />
              {t('editor.uploading', { done: progress.done, total: progress.total })}
            </span>
          ) : storage ? (
            t('editor.drop')
          ) : (
            t('editor.noBucket')
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
