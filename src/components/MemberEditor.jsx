import { useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import { useToast } from './Toast.jsx';
import { SpinnerIcon, TrashIcon, PlusIcon } from './Icons.jsx';
import LanguagesField from './fields/LanguagesField.jsx';
import PlaceField from './fields/PlaceField.jsx';
import { Section, Field } from './fields/Form.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { INTERESTS, MAX_INTERESTS, interestLabel } from '../lib/catalog.js';
import { useT, errorText } from '../lib/i18n.jsx';

function toForm(m) {
  return {
    name: m.name || '',
    age: m.age ?? '',
    tagline: m.tagline || '',
    bio: m.bio || '',
    city: m.city || '',
    zip: m.zip || '',
    canton: m.canton || '',
    languages: m.languages || [],
    interests: m.interests || [],
  };
}

// Profil eines Mitglieds: Profilbild, Grunddaten, Über mich, Sprachen und Interessen
export default function MemberEditor({ member, storage = true, onSaved }) {
  const t = useT();
  const toast = useToast();
  const { updateUser } = useAuth();
  const [form, setForm] = useState(() => toForm(member));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setValue = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const apply = (r) => {
    updateUser(r.user);
    onSaved?.(r.member);
  };

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      apply(await api('/api/me/member', { method: 'PUT', body: form }));
      toast(t('editor.saved'));
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  const toggleInterest = (key) =>
    setForm((f) => {
      if (f.interests.includes(key)) return { ...f, interests: f.interests.filter((k) => k !== key) };
      if (f.interests.length >= MAX_INTERESTS) {
        toast(t('mp.interestsMax', { n: MAX_INTERESTS }));
        return f;
      }
      return { ...f, interests: [...f.interests, key] };
    });

  return (
    <form onSubmit={save} className="editor">
      <Section title={t('mp.photo')}>
        <AvatarField member={member} name={form.name} storage={storage} onChange={apply} />
      </Section>

      <Section title={t('editor.sectionBasics')}>
        <div className="form">
          <Field label={t('editor.name')}>
            <input className="input" value={form.name} onChange={set('name')} maxLength={60} required />
          </Field>
          <Field label={t('mp.age')}>
            <input className="input" type="number" min={18} max={99} value={form.age} onChange={set('age')} />
          </Field>
          <Field label={t('mp.place')} full>
            <PlaceField
              city={form.city}
              zip={form.zip}
              canton={form.canton}
              onChange={(p) => setForm((f) => ({ ...f, ...p }))}
            />
          </Field>
        </div>
      </Section>

      <Section title={t('settings.about')}>
        <div className="form">
          <Field label={t('editor.tagline')} full>
            <input
              className="input"
              value={form.tagline}
              onChange={set('tagline')}
              maxLength={120}
              placeholder={t('mp.taglinePlaceholder')}
            />
          </Field>
          <Field label={t('mp.bio')} full>
            <textarea
              className="input"
              value={form.bio}
              onChange={set('bio')}
              maxLength={2000}
              placeholder={t('mp.bioPlaceholder')}
            />
          </Field>
          <Field label={t('editor.languages')} full>
            <LanguagesField value={form.languages} onChange={setValue('languages')} />
          </Field>
        </div>
      </Section>

      <Section
        title={t('mp.interests')}
        aside={t('mp.interestsCount', { n: form.interests.length, max: MAX_INTERESTS })}
      >
        <div className="toggles interest-toggles">
          {INTERESTS.map((key) => {
            const on = form.interests.includes(key);
            return (
              <button
                type="button"
                key={key}
                className={`toggle ${on ? 'on' : ''}`}
                onClick={() => toggleInterest(key)}
                aria-pressed={on}
              >
                {interestLabel(t, key)}
              </button>
            );
          })}
        </div>
      </Section>

      <div className="form-actions">
        <button className="white-btn" disabled={busy}>
          {busy ? <SpinnerIcon /> : t('editor.save')}
        </button>
      </div>
    </form>
  );
}

function AvatarField({ member, name, storage, onChange }) {
  const t = useT();
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function run(request) {
    setBusy(true);
    try {
      onChange(await request());
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  function upload(file) {
    if (!file?.type.startsWith('image/')) return;
    const form = new FormData();
    form.append('photos', file);
    run(() => api('/api/me/member/avatar', { method: 'POST', form }));
  }

  return (
    <div className="avatar-field">
      <span className="avatar-field-img">
        <Avatar name={name} thumb={member.avatar?.thumb} size={88} />
        {busy && (
          <span className="avatar-field-busy">
            <SpinnerIcon />
          </span>
        )}
      </span>
      <div className="avatar-field-main">
        <p className="field-hint">{storage ? t('mp.photoHint') : t('editor.noBucket')}</p>
        <div className="avatar-field-actions">
          <button
            type="button"
            className="toggle"
            disabled={busy || !storage}
            onClick={() => inputRef.current?.click()}
          >
            <PlusIcon width={15} height={15} /> {member.avatar ? t('mp.photoChange') : t('mp.photoUpload')}
          </button>
          {member.avatar && (
            <button
              type="button"
              className="toggle"
              disabled={busy}
              onClick={() => run(() => api('/api/me/member/avatar', { method: 'DELETE' }))}
            >
              <TrashIcon width={15} height={15} /> {t('mp.photoRemove')}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
