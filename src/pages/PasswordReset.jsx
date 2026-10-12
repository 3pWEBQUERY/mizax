import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Rise } from '../components/Bubble.jsx';
import PageHead from '../components/PageHead.jsx';
import { useToast } from '../components/Toast.jsx';
import { SpinnerIcon, CheckIcon } from '../components/Icons.jsx';
import { AuthField, ErrorBubble } from './Auth.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { useT, errorText } from '../lib/i18n.jsx';

// Passwort vergessen: E-Mail-Adresse eingeben, Link kommt per E-Mail
export function Forgot() {
  useDock({ mode: 'hidden' });
  const t = useT();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/forgot', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="auth">
        <PageHead title={t('auth.forgotTitle')} text={t('auth.forgotText')} />
        {sent ? (
          <Rise i={2} className="auth-card auth-done">
            <span className="settings-icon">
              <CheckIcon width={18} height={18} />
            </span>
            <p>{t('auth.forgotSent', { email })}</p>
          </Rise>
        ) : (
          <Rise i={2} as="form" className="auth-form auth-card" onSubmit={submit}>
            <AuthField label={t('auth.email')}>
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </AuthField>
            <ErrorBubble error={error} />
            <button className="white-btn auth-submit" disabled={busy}>
              {busy ? <SpinnerIcon /> : t('auth.forgotSubmit')}
            </button>
          </Rise>
        )}
        <Rise i={3} className="auth-switch">
          <Link to="/login">{t('auth.backToLogin')}</Link>
        </Rise>
      </div>
    </Page>
  );
}

// Link aus der E-Mail: neues Passwort festlegen, danach direkt angemeldet
export function Reset() {
  useDock({ mode: 'hidden' });
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (password !== repeat) return setError(t('auth.passwordMismatch'));
    setBusy(true);
    setError('');
    try {
      const r = await api('/api/auth/reset', { method: 'POST', body: { token, password } });
      updateUser(r.user);
      toast(t('auth.resetDone'));
      navigate(r.user.role === 'escort' ? '/me' : '/', { replace: true });
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="auth">
        <PageHead title={t('auth.resetTitle')} text={t('auth.resetText')} />
        <Rise i={2} as="form" className="auth-form auth-card" onSubmit={submit}>
          <AuthField label={t('settings.newPassword')} hint={t('auth.passwordHint')}>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </AuthField>
          <AuthField label={t('auth.passwordRepeat')}>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              required
            />
          </AuthField>
          <ErrorBubble error={error} />
          <button className="white-btn auth-submit" disabled={busy || !token}>
            {busy ? <SpinnerIcon /> : t('auth.resetSubmit')}
          </button>
        </Rise>
        <Rise i={3} className="auth-switch">
          <Link to="/forgot">{t('auth.resetAgain')}</Link>
        </Rise>
      </div>
    </Page>
  );
}
