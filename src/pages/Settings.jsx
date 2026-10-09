import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import Avatar from '../components/Avatar.jsx';
import { useToast } from '../components/Toast.jsx';
import { useOwnEscort } from '../components/Feed.jsx';
import {
  BackIcon, ChevronR, UserIcon, MailIcon, KeyIcon, InboxIcon, ChartIcon, FeedIcon, GlobeIcon, PaletteIcon,
  EyeIcon, ShieldIcon, DocIcon, LogoutIcon, TrashIcon, CheckIcon, MoonIcon, SunIcon, HeartIcon, SpinnerIcon,
} from '../components/Icons.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { useI18n, LOCALES, dictionaries, errorText } from '../lib/i18n.jsx';
import { useTheme } from '../lib/theme.jsx';
import { useUnread } from '../lib/inbox.js';

const SECTIONS = ['account', 'password', 'language', 'theme', 'privacy', 'delete'];

const slide = {
  enter: (dir) => ({ opacity: 0, x: dir * 40, filter: 'blur(4px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 380, damping: 36 } },
  exit: (dir) => ({ opacity: 0, x: dir * -40, filter: 'blur(4px)', transition: { duration: 0.18 } }),
};

function Group({ title, children }) {
  return (
    <div className="settings-group">
      {title && <div className="settings-group-title">{title}</div>}
      <div className="settings-card">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value, onClick, danger, chevron = true, checked, badge, code }) {
  return (
    <button type="button" className={`settings-row ${danger ? 'danger' : ''} ${Icon ? '' : 'no-icon'}`} onClick={onClick}>
      {Icon && (
        <span className="settings-icon">
          <Icon width={19} height={19} />
        </span>
      )}
      <span className="settings-label">{label}</span>
      {badge > 0 && <span className="count-badge">{badge}</span>}
      {value && <span className="settings-value">{value}</span>}
      {code && <span className="settings-code">{code}</span>}
      {checked !== undefined ? (
        <span className={`settings-check ${checked ? 'on' : ''}`}>{checked && <CheckIcon width={14} height={14} />}</span>
      ) : (
        chevron && <ChevronR width={16} height={16} className="settings-chev" />
      )}
    </button>
  );
}

export function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 34 }} className="switch-knob" />
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="field settings-field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function SaveButton({ busy, children, danger, disabled }) {
  return (
    <button type="submit" className={`white-btn settings-save ${danger ? 'danger' : ''}`} disabled={busy || disabled}>
      {busy && <SpinnerIcon width={18} height={18} className="spin" />}
      {children}
    </button>
  );
}

// ---------- Unterseiten ----------

function AccountSection({ done }) {
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
        <input className="input" type="email" value={email} maxLength={200} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      {user.role !== 'escort' && (
        <Field label={t('settings.about')} hint={t('settings.aboutHint')}>
          <textarea className="input" value={bio} maxLength={600} onChange={(e) => setBio(e.target.value)} style={{ minHeight: 100 }} />
        </Field>
      )}
      <AnimatePresence initial={false}>
        {emailChanged && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <Field label={t('settings.currentPassword')} hint={t('settings.emailPasswordHint')}>
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>
      <SaveButton busy={busy}>{t('editor.save')}</SaveButton>
    </form>
  );
}

function PasswordSection({ done }) {
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
        <input className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </Field>
      <Field label={t('settings.newPassword')} hint={t('auth.passwordHint')}>
        <input className="input" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
      </Field>
      <Field label={t('settings.repeatPassword')}>
        <input className="input" type="password" autoComplete="new-password" minLength={8} value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
      </Field>
      <SaveButton busy={busy}>{t('settings.changePassword')}</SaveButton>
    </form>
  );
}

function LanguageSection() {
  const { locale, setLocale } = useI18n();
  return (
    <Group>
      {LOCALES.map((l) => (
        <Row key={l} label={dictionaries[l].langName} code={l.toUpperCase()} checked={locale === l} onClick={() => setLocale(l)} />
      ))}
    </Group>
  );
}

function ThemeSection() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  return (
    <Group>
      <Row icon={MoonIcon} label={t('menu.dark')} checked={theme === 'dark'} onClick={() => setTheme('dark')} />
      <Row icon={SunIcon} label={t('menu.light')} checked={theme === 'light'} onClick={() => setTheme('light')} />
    </Group>
  );
}

function PrivacySection() {
  const { t } = useI18n();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const [busy, setBusy] = useState(false);

  async function change(showVisits) {
    setBusy(true);
    updateUser({ showVisits });
    try {
      const r = await api('/api/me/privacy', { method: 'PUT', body: { showVisits } });
      updateUser(r.user);
    } catch (err) {
      updateUser({ showVisits: !showVisits });
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Group>
        <div className="settings-row static">
          <span className="settings-icon">
            <EyeIcon width={19} height={19} />
          </span>
          <span className="settings-label">
            {t('settings.showVisits')}
            <small>{user.role === 'escort' ? t('settings.showVisitsEscort') : t('settings.showVisitsMember')}</small>
          </span>
          <Switch on={user.showVisits} onChange={(v) => !busy && change(v)} label={t('settings.showVisits')} />
        </div>
      </Group>
      <div className="settings-info">
        <p>{t('settings.privacyInfo1')}</p>
        <p>{t('settings.privacyInfo2')}</p>
      </div>
    </>
  );
}

function DeleteSection() {
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
        <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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

// ---------- Seite ----------

export default function Settings() {
  useDock({ mode: 'hidden' });
  const { section: raw } = useParams();
  const section = SECTIONS.includes(raw) ? raw : null;
  const navigate = useNavigate();
  const toast = useToast();
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const { user, ready, logout } = useAuth();
  const own = useOwnEscort();
  const unread = useUnread();

  if (ready && !user) return <Navigate to="/login" replace state={{ from: '/settings' }} />;
  if (!user) return <Page />;

  const escort = user.role === 'escort';
  const go = (s) => navigate(`/settings/${s}`);
  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/settings', { replace: true }));
  const titles = {
    account: t('settings.account'),
    password: t('settings.password'),
    language: t('menu.language'),
    theme: t('menu.theme'),
    privacy: t('settings.privacy'),
    delete: t('settings.deleteAccount'),
  };

  const sections = {
    account: <AccountSection done={back} />,
    password: <PasswordSection done={back} />,
    language: <LanguageSection />,
    theme: <ThemeSection />,
    privacy: <PrivacySection />,
    delete: <DeleteSection />,
  };

  return (
    <Page className="settings-page">
      <div className="settings-top">
        <AnimatePresence initial={false}>
          {section && (
            <motion.button
              key="back"
              type="button"
              className="icon-btn"
              aria-label={t('nav.back')}
              onClick={back}
              initial={{ opacity: 0, width: 0, marginRight: -12 }}
              animate={{ opacity: 1, width: 40, marginRight: 0 }}
              exit={{ opacity: 0, width: 0, marginRight: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <BackIcon width={20} height={20} />
            </motion.button>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={section || 'main'}
            className="me-title"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {section ? titles[section] : t('settings.title')}
          </motion.h1>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="popLayout" initial={false} custom={section ? 1 : -1}>
        <motion.div
          key={section || 'main'}
          className="settings-body"
          custom={section ? 1 : -1}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {section ? (
            sections[section]
          ) : (
            <>
                <div className="settings-profile">
                  <Avatar name={user.name} thumb={own?.photos?.[0]?.thumb} size={48} />
                  <div className="who">
                    <b>{user.name}</b>
                    <span className="mail">{user.email}</span>
                  </div>
                  <span className={`role-badge ${user.isAdmin ? 'admin' : user.role}`}>
                    {user.isAdmin ? t('menu.adminBadge') : t(`menu.${user.role}`)}
                  </span>
                </div>

                <Group>
                  <Row
                    icon={UserIcon}
                    label={escort ? t('menu.myProfile') : t('settings.publicProfile')}
                    onClick={() => navigate(escort ? '/me' : `/member/${user.id}`)}
                  />
                  <Row icon={MailIcon} label={t('settings.account')} value={user.name} onClick={() => go('account')} />
                  <Row icon={KeyIcon} label={t('settings.password')} onClick={() => go('password')} />
                </Group>

                <Group>
                  <Row icon={InboxIcon} label={t('msg.title')} badge={unread} onClick={() => navigate('/messages')} />
                  <Row icon={ChartIcon} label={t('stats.title')} onClick={() => navigate('/stats')} />
                  <Row icon={FeedIcon} label={t('feed.title')} onClick={() => navigate('/feed')} />
                  <Row icon={(p) => <HeartIcon {...p} />} label={t('menu.favorites')} onClick={() => navigate('/favorites')} />
                </Group>

                <Group>
                  <Row icon={GlobeIcon} label={t('menu.language')} value={dictionaries[locale].langName} onClick={() => go('language')} />
                  <Row icon={PaletteIcon} label={t('menu.theme')} value={theme === 'dark' ? t('menu.dark') : t('menu.light')} onClick={() => go('theme')} />
                  <Row
                    icon={EyeIcon}
                    label={t('settings.privacy')}
                    value={user.showVisits ? t('settings.visible') : t('settings.anonymous')}
                    onClick={() => go('privacy')}
                  />
                </Group>

                <Group>
                  <Row icon={ShieldIcon} label={t('legal.privacyTitle')} onClick={() => navigate('/datenschutz')} />
                  <Row icon={DocIcon} label={t('legal.termsTitle')} onClick={() => navigate('/agb')} />
                </Group>

                <Group>
                  <Row
                    icon={LogoutIcon}
                    label={t('menu.logout')}
                    chevron={false}
                    onClick={async () => {
                      await logout();
                      toast(t('auth.loggedOut'));
                      navigate('/');
                    }}
                  />
                </Group>

                {!user.isAdmin && (
                  <button type="button" className="settings-delete" onClick={() => go('delete')}>
                    <TrashIcon width={16} height={16} />
                    {t('settings.deleteAccount')}
                  </button>
                )}
              </>
            )}
        </motion.div>
      </AnimatePresence>
    </Page>
  );
}
