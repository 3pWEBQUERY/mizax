import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { Placeholder } from '../components/Media.jsx';
import { useToast } from '../components/Toast.jsx';
import { ChevronL, ChevronR, TrashIcon, SpinnerIcon, PlusIcon } from '../components/Icons.jsx';
import { api, getToken, setToken } from '../lib/api.js';
import { loadEscorts } from '../lib/store.js';
import { useDock } from '../lib/dock.jsx';

const empty = {
  name: '',
  age: 21,
  city: '',
  tagline: '',
  bio: '',
  height: '',
  nationality: '',
  languages: 'Deutsch, Englisch',
  services: '',
  rates: [{ label: '1 Stunde', price: '' }],
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

function toForm(e) {
  return {
    ...empty,
    ...e,
    height: e.height || '',
    languages: (e.languages || []).join(', '),
    services: (e.services || []).join(', '),
    rates: e.rates?.length ? e.rates : [{ label: '', price: '' }],
  };
}

export default function Admin() {
  useDock({ mode: 'hidden' });
  const [authed, setAuthed] = useState(() => Boolean(getToken()));
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!authed) return;
    api('/api/admin/status', { admin: true })
      .then(setStatus)
      .catch((err) => {
        if (err.status === 401) {
          setToken('');
          setAuthed(false);
        }
      });
  }, [authed]);

  return (
    <Page>
      <AnimatePresence mode="wait" initial={false}>
        {authed ? (
          <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard
              status={status}
              onLogout={() => {
                setToken('');
                setAuthed(false);
              }}
            />
          </motion.div>
        ) : (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Login onDone={() => setAuthed(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}

function Login({ onDone }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api('/api/admin/login', { method: 'POST', body: { password: pw } });
      setToken(token);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bubbles" style={{ marginTop: '12vh' }}>
      <Bubble i={0}>Verwaltung.</Bubble>
      <Bubble i={1}>Melde dich mit dem Admin-Passwort an, um Profile und Fotos zu verwalten.</Bubble>
      <Rise i={2} style={{ width: '100%' }}>
        <form onSubmit={submit} style={{ display: 'flex', gap: 10, width: '100%' }}>
          <input
            className="input"
            type="password"
            placeholder="Passwort"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            style={{ borderRadius: 999, height: 58, padding: '0 22px', fontSize: 17 }}
          />
          <button className="white-btn" disabled={busy || !pw}>
            {busy ? <SpinnerIcon /> : 'Anmelden'}
          </button>
        </form>
      </Rise>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bubble" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Dashboard({ status, onLogout }) {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null); // id | 'new' | null

  const refresh = useCallback(async () => {
    const rows = await api('/api/admin/escorts', { admin: true });
    setList(rows);
    loadEscorts(true).catch(() => {});
    return rows;
  }, []);

  useEffect(() => {
    refresh().catch((e) => toast(e.message));
  }, [refresh, toast]);

  const current = selected === 'new' ? null : list?.find((e) => e.id === selected);

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">Profile verwalten</h1>
        <div className="status-row">
          {status && (
            <>
              <span className="badge">{status.db ? '● Postgres verbunden' : '○ Keine Datenbank'}</span>
              <span className="badge">{status.storage ? '● Bucket verbunden' : '○ Kein Bucket'}</span>
            </>
          )}
          <button className="badge light" onClick={() => setSelected('new')}>
            <PlusIcon width={14} height={14} /> Neues Profil
          </button>
          <button className="badge" onClick={onLogout}>
            Abmelden
          </button>
        </div>
      </div>

      <div className="admin-grid">
        <div className="panel">
          <div className="admin-list">
            {!list && <div className="empty">Lädt…</div>}
            {list?.map((e) => (
              <button
                key={e.id}
                className={`admin-item ${selected === e.id ? 'active' : ''}`}
                onClick={() => setSelected(e.id)}
              >
                <div className="admin-thumb">
                  {e.photos[0] ? <img src={e.photos[0].thumb} alt="" /> : <Placeholder escort={e} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {e.name}, {e.age}
                  </div>
                  <div className="meta">
                    {e.city || '–'} · {e.photos.length} Fotos{e.published ? '' : ' · versteckt'}
                  </div>
                </div>
              </button>
            ))}
            {list && !list.length && <div className="empty">Noch keine Profile.</div>}
          </div>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div
                key={selected}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <Editor
                  escort={current}
                  storage={status?.storage}
                  onSaved={async (e) => {
                    await refresh();
                    setSelected(e.id);
                  }}
                  onDeleted={async () => {
                    await refresh();
                    setSelected(null);
                  }}
                />
              </motion.div>
            ) : (
              <motion.div key="none" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Wähle links ein Profil oder lege ein neues an.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

function Editor({ escort, storage, onSaved, onDeleted }) {
  const toast = useToast();
  const [form, setForm] = useState(() => (escort ? toForm(escort) : { ...empty }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const flip = (k) => () => setForm((f) => ({ ...f, [k]: !f[k] }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, age: Number(form.age), height: form.height ? Number(form.height) : null };
      const saved = escort
        ? await api(`/api/admin/escorts/${escort.id}`, { method: 'PUT', admin: true, body })
        : await api('/api/admin/escorts', { method: 'POST', admin: true, body });
      toast('Gespeichert');
      await onSaved(saved);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!escort || !confirm(`Profil „${escort.name}“ wirklich löschen?`)) return;
    try {
      await api(`/api/admin/escorts/${escort.id}`, { method: 'DELETE', admin: true });
      toast('Profil gelöscht');
      await onDeleted();
    } catch (err) {
      toast(err.message);
    }
  }

  const setRate = (idx, key, val) =>
    setForm((f) => ({ ...f, rates: f.rates.map((r, i) => (i === idx ? { ...r, [key]: val } : r)) }));

  return (
    <form onSubmit={save}>
      <div className="form">
        <Field label="Name">
          <input className="input" value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Alter (mind. 18)">
          <input className="input" type="number" min={18} max={99} value={form.age} onChange={set('age')} required />
        </Field>
        <Field label="Stadt">
          <input className="input" value={form.city} onChange={set('city')} />
        </Field>
        <Field label="Herkunft">
          <input className="input" value={form.nationality} onChange={set('nationality')} />
        </Field>
        <Field label="Größe (cm)">
          <input className="input" type="number" value={form.height} onChange={set('height')} />
        </Field>
        <Field label="Akzentfarbe (Platzhalter)">
          <input className="input" type="color" value={form.accent} onChange={set('accent')} style={{ height: 46, padding: 6 }} />
        </Field>
        <Field label="Kurzbeschreibung" full>
          <input className="input" value={form.tagline} onChange={set('tagline')} />
        </Field>
        <Field label="Über mich (Absätze mit Leerzeile trennen – jeder Absatz wird eine Bubble)" full>
          <textarea className="input" value={form.bio} onChange={set('bio')} />
        </Field>
        <Field label="Sprachen (kommagetrennt)">
          <input className="input" value={form.languages} onChange={set('languages')} />
        </Field>
        <Field label="Leistungen (kommagetrennt)">
          <input className="input" value={form.services} onChange={set('services')} />
        </Field>
        <Field label="WhatsApp-Nummer">
          <input className="input" value={form.whatsapp} onChange={set('whatsapp')} placeholder="+49 …" />
        </Field>
        <Field label="Telefon">
          <input className="input" value={form.phone} onChange={set('phone')} placeholder="+49 …" />
        </Field>
        <Field label="E-Mail">
          <input className="input" type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Sortierung (klein = weiter vorne)">
          <input className="input" type="number" value={form.sort} onChange={set('sort')} />
        </Field>
      </div>

      <div className="section-title">Status</div>
      <div className="toggles">
        {[
          ['published', 'Veröffentlicht'],
          ['available', 'Verfügbar'],
          ['verified', 'Verifiziert'],
          ['featured', 'Hervorgehoben'],
        ].map(([k, label]) => (
          <button type="button" key={k} className={`toggle ${form[k] ? 'on' : ''}`} onClick={flip(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="section-title">Honorar</div>
      {form.rates.map((r, idx) => (
        <div className="rate-row" key={idx}>
          <input className="input" placeholder="z. B. 1 Stunde" value={r.label} onChange={(e) => setRate(idx, 'label', e.target.value)} />
          <input className="input" placeholder="z. B. 300 €" value={r.price} onChange={(e) => setRate(idx, 'price', e.target.value)} />
          <button
            type="button"
            className="mini-btn danger"
            style={{ width: 40, height: 46, borderRadius: 14 }}
            onClick={() => setForm((f) => ({ ...f, rates: f.rates.filter((_, i) => i !== idx) }))}
            aria-label="Zeile entfernen"
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
        + Zeile
      </button>

      <div className="section-title">Fotos</div>
      {escort ? (
        <Photos escort={escort} storage={storage} onChange={onSaved} />
      ) : (
        <div className="meta" style={{ color: 'var(--muted)' }}>
          Speichere das Profil zuerst, danach kannst du Fotos hochladen.
        </div>
      )}

      <div className="form-actions">
        {escort && (
          <button type="button" className="ghost-btn danger-btn" onClick={remove}>
            Löschen
          </button>
        )}
        {escort && (
          <a className="ghost-btn" href={`/escort/${escort.slug}`} target="_blank" rel="noreferrer">
            Ansehen
          </a>
        )}
        <button className="white-btn" disabled={busy}>
          {busy ? <SpinnerIcon /> : escort ? 'Speichern' : 'Profil anlegen'}
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

function Photos({ escort, storage, onChange }) {
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
      const saved = await api(`/api/admin/escorts/${escort.id}/photos`, { method: 'POST', admin: true, form });
      toast(`${imgs.length} Foto${imgs.length > 1 ? 's' : ''} hochgeladen`);
      await onChange(saved);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function move(idx, dir) {
    const ids = escort.photos.map((p) => p.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    const saved = await api(`/api/admin/escorts/${escort.id}/photos/order`, { method: 'PUT', admin: true, body: { ids } });
    await onChange(saved);
  }

  async function del(id) {
    const saved = await api(`/api/admin/photos/${id}`, { method: 'DELETE', admin: true });
    await onChange(saved);
  }

  return (
    <div className="photo-grid">
      {escort.photos.map((p, idx) => (
        <motion.div layout key={p.id} className="photo-item">
          <img src={p.thumb} alt="" />
          {idx === 0 && (
            <span className="badge light" style={{ position: 'absolute', top: 6, left: 6, fontSize: 11 }}>
              Titelbild
            </span>
          )}
          <div className="photo-actions">
            <button type="button" className="mini-btn" onClick={() => move(idx, -1)} aria-label="Nach vorne">
              <ChevronL width={16} height={16} />
            </button>
            <button type="button" className="mini-btn danger" onClick={() => del(p.id)} aria-label="Foto löschen">
              <TrashIcon />
            </button>
            <button type="button" className="mini-btn" onClick={() => move(idx, 1)} aria-label="Nach hinten">
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
        {busy ? <SpinnerIcon /> : storage ? 'Fotos hierher ziehen oder klicken' : 'Bucket nicht verbunden'}
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
