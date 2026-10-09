import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { useToast } from '../components/Toast.jsx';
import { UserIcon, SparkIcon, SpinnerIcon, CheckIcon } from '../components/Icons.jsx';
import { useDock } from '../lib/dock.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useT, errorText } from '../lib/i18n.jsx';

const swap = {
  initial: { opacity: 0, y: 12, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(6px)' },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

function ErrorBubble({ error }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div key={error} {...swap}>
          <div className="bubble auth-error">{error}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Bereits angemeldete Benutzer direkt weiterleiten
function useRedirectIfAuthed() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && user) navigate(user.isAdmin ? '/admin' : user.role === 'escort' ? '/me' : '/', { replace: true });
  }, [ready, user, navigate]);
}

export function Login() {
  useDock({ mode: 'hidden' });
  useRedirectIfAuthed();
  const t = useT();
  const toast = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(email, password);
      toast(t('auth.welcome', { name: user.name }));
      navigate(location.state?.from || (user.isAdmin ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="auth">
        <div className="bubbles">
          <Bubble i={0}>{t('auth.loginTitle')}</Bubble>
          <Bubble i={1}>{t('auth.loginText')}</Bubble>
        </div>
        <Rise i={2} as="form" className="auth-form" onSubmit={submit}>
          <input
            className="auth-input"
            type="email"
            autoComplete="email"
            placeholder={t('auth.email')}
            aria-label={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            className="auth-input"
            type="password"
            autoComplete="current-password"
            placeholder={t('auth.password')}
            aria-label={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="white-btn auth-submit" disabled={busy}>
            {busy ? <SpinnerIcon /> : t('auth.submitLogin')}
          </button>
        </Rise>
        <div style={{ marginTop: 12 }}>
          <ErrorBubble error={error} />
        </div>
        <Rise i={3} className="auth-switch">
          {t('auth.noAccount')}
          <Link to="/register" state={location.state}>
            {t('menu.register')}
          </Link>
        </Rise>
      </div>
    </Page>
  );
}

// „Ich akzeptiere die AGB und die Datenschutzerklärung“ mit Links (öffnen in neuem Tab)
function AcceptTerms({ t }) {
  const parts = t('auth.acceptTerms').split(/(\{terms\}|\{privacy\})/);
  return parts.map((part, i) =>
    part === '{terms}' ? (
      <a key={i} href="/agb" target="_blank" rel="noreferrer" className="inline-link">
        {t('legal.terms')}
      </a>
    ) : part === '{privacy}' ? (
      <a key={i} href="/datenschutz" target="_blank" rel="noreferrer" className="inline-link">
        {t('legal.privacyTitle')}
      </a>
    ) : (
      part
    ),
  );
}

export function Register() {
  useDock({ mode: 'hidden' });
  useRedirectIfAuthed();
  const t = useT();
  const toast = useToast();
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', adult: false, terms: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: k === 'adult' || k === 'terms' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await register({ ...form, role });
      toast(t('auth.welcome', { name: user.name }));
      navigate(user.role === 'escort' ? '/me' : location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  const roles = [
    { key: 'member', Icon: UserIcon, title: t('auth.roleMember'), text: t('auth.roleMemberText') },
    { key: 'escort', Icon: SparkIcon, title: t('auth.roleEscort'), text: t('auth.roleEscortText') },
  ];

  return (
    <Page>
      <div className="auth">
        <div className="bubbles">
          <Bubble i={0}>{t('auth.registerTitle')}</Bubble>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={role ? 'details' : 'role'} {...swap}>
              <div className="bubble">{role ? t('auth.detailsText') : t('auth.registerText')}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {!role ? (
            <motion.div key="roles" className="roles" {...swap}>
              {roles.map(({ key, Icon, title, text }, idx) => (
                <motion.button
                  key={key}
                  type="button"
                  className={`role-card ${key}`}
                  onClick={() => setRole(key)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.12 + idx * 0.08 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="role-icon">
                    <Icon />
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.form key="details" className="auth-form" onSubmit={submit} {...swap}>
              <div className="role-chosen">
                <span>{t('auth.as', { role: t(`menu.${role}`) })}</span>
                <button type="button" onClick={() => setRole(null)}>
                  {t('auth.change')}
                </button>
              </div>
              <input
                className="auth-input"
                autoComplete="nickname"
                placeholder={t('auth.name')}
                aria-label={t('auth.name')}
                value={form.name}
                onChange={set('name')}
                maxLength={60}
                required
                autoFocus
              />
              <input
                className="auth-input"
                type="email"
                autoComplete="email"
                placeholder={t('auth.email')}
                aria-label={t('auth.email')}
                value={form.email}
                onChange={set('email')}
                required
              />
              <input
                className="auth-input"
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.password')}
                aria-label={t('auth.password')}
                value={form.password}
                onChange={set('password')}
                minLength={8}
                required
              />
              <div className="auth-hint">{t('auth.passwordHint')}</div>
              <label className="check">
                <input type="checkbox" checked={form.adult} onChange={set('adult')} required />
                <span className="check-box">{form.adult && <CheckIcon />}</span>
                <span>{t('auth.ageConfirm')}</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={form.terms} onChange={set('terms')} required />
                <span className="check-box">{form.terms && <CheckIcon />}</span>
                <span>
                  <AcceptTerms t={t} />
                </span>
              </label>
              <button className="white-btn auth-submit" disabled={busy}>
                {busy ? <SpinnerIcon /> : t('auth.submitRegister')}
              </button>
              <ErrorBubble error={error} />
            </motion.form>
          )}
        </AnimatePresence>

        <Rise i={3} className="auth-switch">
          {t('auth.haveAccount')}
          <Link to="/login" state={location.state}>
            {t('menu.login')}
          </Link>
        </Rise>
      </div>
    </Page>
  );
}
