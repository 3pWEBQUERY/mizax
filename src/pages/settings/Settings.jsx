import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Page from '../../components/Page.jsx';
import Avatar from '../../components/Avatar.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useOwnEscort } from '../../lib/ownEscort.js';
import {
  BackIcon,
  UserIcon,
  MailIcon,
  KeyIcon,
  InboxIcon,
  ChartIcon,
  FeedIcon,
  GlobeIcon,
  PaletteIcon,
  EyeIcon,
  ShieldIcon,
  DocIcon,
  LogoutIcon,
  TrashIcon,
  HeartIcon,
} from '../../components/Icons.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useDock } from '../../lib/dock.jsx';
import { useI18n, dictionaries } from '../../lib/i18n.jsx';
import { useTheme } from '../../lib/theme.jsx';
import { useUnread } from '../../lib/inbox.js';

const SECTIONS = ['account', 'password', 'language', 'theme', 'privacy', 'delete'];

const slide = {
  enter: (dir) => ({ opacity: 0, x: dir * 40, filter: 'blur(4px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 380, damping: 36 } },
  exit: (dir) => ({ opacity: 0, x: dir * -40, filter: 'blur(4px)', transition: { duration: 0.18 } }),
};
import { Group, Row } from './ui.jsx';
import { AccountSection, PasswordSection, DeleteSection } from './AccountSections.jsx';
import { LanguageSection, ThemeSection, PrivacySection } from './PreferenceSections.jsx';

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
                <Row
                  icon={(p) => <HeartIcon {...p} />}
                  label={t('menu.favorites')}
                  onClick={() => navigate('/favorites')}
                />
              </Group>

              <Group>
                <Row
                  icon={GlobeIcon}
                  label={t('menu.language')}
                  value={dictionaries[locale].langName}
                  onClick={() => go('language')}
                />
                <Row
                  icon={PaletteIcon}
                  label={t('menu.theme')}
                  value={theme === 'dark' ? t('menu.dark') : t('menu.light')}
                  onClick={() => go('theme')}
                />
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
