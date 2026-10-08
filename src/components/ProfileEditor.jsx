import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useToast } from './Toast.jsx';
import { ChevronL, ChevronR, TrashIcon, SpinnerIcon } from './Icons.jsx';
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
  languages: '',
  services: '',
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
    languages: (e.languages || []).join(', '),
    services: (e.services || []).join(', '),
    rates: e.rates?.length ? e.rates : [{ label: '', price: '' }],
  };
}

// Endpunkte für Verwaltung bzw. eigenes Profil
export const endpoints = {
  admin: {
    admin: true,
    save: (e) => (e ? { method: 'PUT', path: `/api/admin/escorts/${e.id}` } : { method: 'POST', path: '/api/admin/escorts' }),
    photos: (e) => `/api/admin/escorts/${e.id}/photos`,
    order: (e) => `/api/admin/escorts/${e.id}/photos/order`,
    deletePhoto: (id) => `/api/admin/photos/${id}`,
    remove: (e) => `/api/admin/escorts/${e.id}`,
  },
  self: {
    admin: false,
    save: () => ({ method: 'PUT', path: '/api/me/profile' }),
    photos: () => '/api/me/profile/photos',
    order: () => '/api/me/profile/photos/order',
    deletePhoto: (id) => `/api/me/photos/${id}`,
    remove: null,
  },
};

export default function ProfileEditor({ escort, mode = 'admin', storage = true, defaults, onSaved, onDeleted }) {
  const t = useT();
  const toast = useToast();
  const ep = endpoints[mode];
  const [form, setForm] = useState(() => toForm(escort, defaults));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const flip = (k) => () => setForm((f) => ({ ...f, [k]: !f[k] }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, age: Number(form.age), height: form.height ? Number(form.height) : null };
      const { method, path } = ep.save(escort);
      const saved = await api(path, { method, admin: ep.admin, body });
      toast(t('editor.saved'));
      await onSaved?.(saved);
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!escort || !ep.remove || !confirm(t('editor.confirmDelete', { name: escort.name }))) return;
    try {
      await api(ep.remove(escort), { method: 'DELETE', admin: ep.admin });
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
    ...(mode === 'admin'
      ? [
          ['verified', t('editor.verified')],
          ['featured', t('editor.featured')],
        ]
      : []),
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
          <input className="input" value={form.nationality} onChange={set('nationality')} />
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
        <Field label={t('editor.languages')}>
          <input className="input" value={form.languages} onChange={set('languages')} />
        </Field>
        <Field label={t('editor.services')}>
          <input className="input" value={form.services} onChange={set('services')} />
        </Field>
        <Field label={t('editor.whatsapp')}>
          <input className="input" value={form.whatsapp} onChange={set('whatsapp')} placeholder="+49 …" />
        </Field>
        <Field label={t('editor.phone')}>
          <input className="input" value={form.phone} onChange={set('phone')} placeholder="+49 …" />
        </Field>
        <Field label={t('editor.email')}>
          <input className="input" type="email" value={form.email} onChange={set('email')} />
        </Field>
        {mode === 'admin' && (
          <Field label={t('editor.sort')}>
            <input className="input" type="number" value={form.sort} onChange={set('sort')} />
          </Field>
        )}
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

      <div className="section-title">{t('editor.photos')}</div>
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
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function upload(files) {
    const imgs = [...files].filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    setBusy(true);
    try {
      const form = new FormData();
      imgs.forEach((f) => form.append('photos', f));
      const saved = await api(ep.photos(escort), { method: 'POST', admin: ep.admin, form });
      toast(t('editor.uploaded', { n: imgs.length }));
      await onChange?.(saved);
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  async function move(idx, dir) {
    const ids = escort.photos.map((p) => p.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    try {
      const saved = await api(ep.order(escort), { method: 'PUT', admin: ep.admin, body: { ids } });
      await onChange?.(saved);
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  async function del(id) {
    try {
      const saved = await api(ep.deletePhoto(id), { method: 'DELETE', admin: ep.admin });
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
        {busy ? <SpinnerIcon /> : storage ? t('editor.drop') : t('editor.noBucket')}
      </button>
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
