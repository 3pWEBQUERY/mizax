import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { TrashIcon, CheckIcon } from '../../components/Icons.jsx';
import { Field, SaveButton } from './ui.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useI18n, errorText } from '../../lib/i18n.jsx';

// Unterseiten: Konto, Passwort, Konto löschen

export function AccountSection({ done }) {
  const { t } = useI18n();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api('/api/me/account', { method: 'PUT', body: { name, email, bio, password } });
      updateUser(r.user);
      toast(t('editor.saved'));
      done();
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      <Field label={t('auth.name')} hint={user.role === 'escort' ? t('settings.nameHintEscort') : null}>
        <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label={t('auth.email')}>
        <input
          className="input"
          type="email"
          value={email}
          maxLength={200}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      {user.role !== 'escort' && (
        <Field label={t('settings.about')} hint={t('settings.aboutHint')}>
          <textarea
            className="input"
            value={bio}
            maxLength={600}
            onChange={(e) => setBio(e.target.value)}
            style={{ minHeight: 100 }}
          />
        </Field>
      )}
      <AnimatePresence initial={false}>
        {emailChanged && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <Field label={t('settings.currentPassword')} hint={t('settings.emailPasswordHint')}>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>
      <SaveButton busy={busy}>{t('editor.save')}</SaveButton>
    </form>
  );
}

export function PasswordSection({ done }) {
  const { t } = useI18n();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (next !== repeat) {
      toast(t('settings.mismatch'));
      return;
    }
    setBusy(true);
    try {
      await api('/api/me/password', { method: 'PUT', body: { current, next } });
      toast(t('settings.passwordChanged'));
      done();
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      <Field label={t('settings.currentPassword')}>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </Field>
      <Field label={t('settings.newPassword')} hint={t('auth.passwordHint')}>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
      </Field>
      <Field label={t('settings.repeatPassword')}>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          required
        />
      </Field>
      <SaveButton busy={busy}>{t('settings.changePassword')}</SaveButton>
    </form>
  );
}

export function DeleteSection() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { user, clearUser } = useAuth();
  const [password, setPassword] = useState('');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/me/account', { method: 'DELETE', body: { password } });
      clearUser();
      toast(t('settings.deleted'));
      navigate('/', { replace: true });
    } catch (err) {
      toast(errorText(t, err));
      setBusy(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      <div className="settings-warning">
        <TrashIcon width={22} height={22} />
        <div>
          <b>{t('settings.deleteTitle')}</b>
          <p>{user.role === 'escort' ? t('settings.deleteTextEscort') : t('settings.deleteTextMember')}</p>
        </div>
      </div>
      <Field label={t('settings.currentPassword')}>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <label className="check">
        <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
        <span className="check-box">
          <CheckIcon />
        </span>
        <span>{t('settings.deleteConfirm')}</span>
      </label>
      <SaveButton busy={busy} danger disabled={!sure || !password}>
        {t('settings.deleteAccount')}
      </SaveButton>
    </form>
  );
}
