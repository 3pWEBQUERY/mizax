import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  BackIcon,
  SunIcon,
  MoonIcon,
  UserIcon,
  EditIcon,
  LogoutIcon,
  LoginIcon,
  HeartIcon,
  SearchIcon,
  ShieldIcon,
  GearIcon,
  InboxIcon,
  ChartIcon,
  FeedIcon,
} from './Icons.jsx';
import { useUnread } from '../lib/inbox.js';
import { useDockState } from '../lib/dock.jsx';
import { LegalLinks } from '../pages/Legal.jsx';
import { useI18n, LOCALES, dictionaries } from '../lib/i18n.jsx';
import { useTheme } from '../lib/theme.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from './Toast.jsx';

const spring = { type: 'spring', stiffness: 420, damping: 34 };
const menuMotion = {
  initial: { opacity: 0, scale: 0.94, y: -6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -4 },
  transition: { type: 'spring', stiffness: 420, damping: 32 },
};

function useOutside(ref, open, close) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && close();
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, close]);
}

export function LanguagePicker({ id = 'lang' }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang-grid" role="radiogroup" aria-label={t('menu.language')}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          className={`lang-opt ${locale === l ? 'active' : ''}`}
          onClick={() => setLocale(l)}
          title={dictionaries[l].langName}
        >
          {locale === l && <motion.span layoutId={`${id}-pill`} className="chip-bg" transition={spring} />}
          <span>{l.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const t = useI18n().t;
  return (
    <div className="theme-switch">
      {[
        ['dark', MoonIcon, t('menu.dark')],
        ['light', SunIcon, t('menu.light')],
      ].map(([key, Icon, label]) => (
        <button key={key} type="button" className={theme === key ? 'active' : ''} onClick={() => setTheme(key)}>
          {theme === key && <motion.span layoutId="theme-pill" className="chip-bg" transition={spring} />}
          <span>
            <Icon width={16} height={16} /> {label}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function TopBar({ onSearch, searchOpen }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const toast = useToast();
  const { query, canton, geo, sidebarOpen, setSidebarOpen } = useDockState();
  const unread = useUnread();
  const filtered = Boolean(query.trim() || canton || geo);
  const [menu, setMenu] = useState(false);
  const accRef = useRef(null);
  useOutside(accRef, menu, () => setMenu(false));

  useEffect(() => setMenu(false), [pathname]);

  const isSub =
    pathname.startsWith('/escort/') ||
    pathname === '/me/services' ||
    /^\/messages\/./.test(pathname) ||
    pathname.startsWith('/member/');
  const tabs = [
    { to: '/', label: t('nav.discover') },
    { to: '/favorites', label: t('nav.favorites') },
    { to: '/feed', label: t('nav.feed'), className: 'tab-feed' },
  ];
  const active =
    pathname === '/favorites' || pathname === '/feed'
      ? pathname
      : pathname === '/' || pathname.startsWith('/escort/')
        ? '/'
        : null;
  const fallback = pathname === '/me/services' ? '/me' : pathname.startsWith('/messages/') ? '/messages' : '/';
  const initial = user ? user.name.trim().charAt(0).toUpperCase() || 'M' : null;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className={`icon-btn side-toggle ${sidebarOpen && !isSub ? 'active' : ''}`}
          aria-label={isSub ? t('nav.back') : t('nav.panel')}
          aria-expanded={isSub ? undefined : sidebarOpen}
          onClick={() => {
            if (!isSub) setSidebarOpen(!sidebarOpen);
            else if (window.history.state?.idx > 0) navigate(-1);
            else navigate(fallback);
          }}
        >
          {!isSub && !sidebarOpen && unread > 0 && <span className="search-dot" />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isSub ? 'back' : 'home'}
              initial={{ opacity: 0, scale: 0.7, rotate: isSub ? 20 : -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.22 }}
              style={{ display: 'grid' }}
            >
              {isSub ? <BackIcon /> : <HomeIcon />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <nav className="segmented topbar-center" aria-label={t('nav.navigation')}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`${tab.className || ''} ${active === tab.to ? 'active' : ''}`}
            end
          >
            {active === tab.to && <motion.div layoutId="nav-pill" className="pill" transition={spring} />}
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="topbar-right">
        <button
          type="button"
          className={`search-pill ${searchOpen ? 'active' : ''}`}
          onClick={onSearch}
          data-search-toggle
          aria-expanded={searchOpen}
          aria-label={t('nav.search')}
        >
          <SearchIcon />
          <span className="search-label">{t('nav.search')}</span>
          {filtered && !searchOpen && <span className="search-dot" />}
        </button>

        <div className="menu-anchor" ref={accRef}>
          <button
            type="button"
            className="avatar"
            aria-label={t('nav.account')}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {initial || <UserIcon width={22} height={22} />}
            {unread > 0 && <span className="avatar-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div className="menu" {...menuMotion}>
                {user ? (
                  <>
                    <div className="menu-head">
                      <div className="avatar">{initial}</div>
                      <div className="who">
                        <b>{user.name}</b>
                        <span>{user.email}</span>
                      </div>
                      <span
                        className={`role-badge ${user.isAdmin ? 'admin' : user.role}`}
                        style={{ marginLeft: 'auto' }}
                      >
                        {user.isAdmin ? t('menu.adminBadge') : t(`menu.${user.role}`)}
                      </span>
                    </div>
                    <div className="menu-sep" />
                    {user.isAdmin && (
                      <button type="button" className="menu-item" onClick={() => navigate('/admin')}>
                        <ShieldIcon /> {t('menu.admin')}
                      </button>
                    )}
                    {user.role === 'escort' && (
                      <button type="button" className="menu-item" onClick={() => navigate('/me')}>
                        <EditIcon /> {t('menu.myProfile')}
                      </button>
                    )}
                    <button type="button" className="menu-item" onClick={() => navigate('/messages')}>
                      <InboxIcon /> {t('msg.title')}
                      {unread > 0 && <span className="count-badge">{unread}</span>}
                    </button>
                    <button type="button" className="menu-item" onClick={() => navigate('/feed')}>
                      <FeedIcon /> {t('feed.title')}
                    </button>
                    <button type="button" className="menu-item" onClick={() => navigate('/stats')}>
                      <ChartIcon /> {t('stats.title')}
                    </button>
                    <button type="button" className="menu-item" onClick={() => navigate('/favorites')}>
                      <HeartIcon width={20} height={20} /> {t('menu.favorites')}
                    </button>
                    <button type="button" className="menu-item" onClick={() => navigate('/settings')}>
                      <GearIcon /> {t('menu.settings')}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="menu-head">
                      <div className="avatar">
                        <UserIcon width={20} height={20} />
                      </div>
                      <div className="who">
                        <b>{t('menu.guest')}</b>
                        <span style={{ whiteSpace: 'normal' }}>{t('menu.guestText')}</span>
                      </div>
                    </div>
                    <div className="menu-sep" />
                    <button type="button" className="menu-item" onClick={() => navigate('/login')}>
                      <LoginIcon /> {t('menu.login')}
                    </button>
                    <button type="button" className="menu-item" onClick={() => navigate('/register')}>
                      <UserIcon width={20} height={20} /> {t('menu.register')}
                    </button>
                  </>
                )}
                <div className="menu-sep" />
                <div className="menu-label">{t('menu.language')}</div>
                <LanguagePicker id="acc-lang" />
                <div className="menu-label">{t('menu.theme')}</div>
                <ThemeSwitch />
                <LegalLinks className="menu-legal" />
                {user && (
                  <>
                    <div className="menu-sep" />
                    <button
                      type="button"
                      className="menu-item danger"
                      onClick={async () => {
                        setMenu(false);
                        await logout();
                        toast(t('auth.loggedOut'));
                        if (/^\/(me|favorites|admin|messages|stats|settings|feed|member)/.test(pathname)) navigate('/');
                      }}
                    >
                      <LogoutIcon /> {t('menu.logout')}
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
