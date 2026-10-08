import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon, BackIcon, SunIcon, MoonIcon, UserIcon, EditIcon, LogoutIcon, LoginIcon, HeartIcon, SearchIcon, ShieldIcon,
} from './Icons.jsx';
import { useDockState } from '../lib/dock.jsx';
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
  const { query, city } = useDockState();
  const filtered = Boolean(query.trim() || city);
  const [menu, setMenu] = useState(false);
  const accRef = useRef(null);
  useOutside(accRef, menu, () => setMenu(false));

  useEffect(() => setMenu(false), [pathname]);

  const isSub = pathname.startsWith('/escort/');
  const tabs = [
    { to: '/', label: t('nav.discover') },
    { to: '/favorites', label: t('nav.favorites') },
  ];
  const active = pathname === '/favorites' ? '/favorites' : pathname === '/' || isSub ? '/' : null;
  const initial = user ? user.name.trim().charAt(0).toUpperCase() || 'M' : null;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn"
          aria-label={isSub ? t('nav.back') : t('nav.home')}
          onClick={() => {
            if (isSub && window.history.state?.idx > 0) navigate(-1);
            else navigate('/');
          }}
        >
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
          <NavLink key={tab.to} to={tab.to} className={active === tab.to ? 'active' : ''} end>
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
                      <span className={`role-badge ${user.isAdmin ? 'admin' : user.role}`} style={{ marginLeft: 'auto' }}>
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
                    <button type="button" className="menu-item" onClick={() => navigate('/favorites')}>
                      <HeartIcon width={20} height={20} /> {t('menu.favorites')}
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
                        if (['/me', '/favorites', '/admin'].includes(pathname)) navigate('/');
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
