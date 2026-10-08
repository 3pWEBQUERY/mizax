import { motion } from 'framer-motion';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, BackIcon } from './Icons.jsx';
import { AnimatePresence } from 'framer-motion';

const tabs = [
  { to: '/', label: 'Entdecken' },
  { to: '/favoriten', label: 'Favoriten' },
];

export default function TopBar({ onSearch }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isSub = pathname.startsWith('/escort/');
  const active =
    pathname === '/favoriten' ? '/favoriten' : pathname === '/' || isSub ? '/' : null;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn"
          aria-label={isSub ? 'Zurück' : 'Startseite'}
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

      <nav className="segmented topbar-center" aria-label="Navigation">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={active === t.to ? 'active' : ''} end>
            {active === t.to && (
              <motion.div
                layoutId="nav-pill"
                className="pill"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="topbar-right">
        <button type="button" className="search-pill" onClick={onSearch}>
          Suchen
        </button>
        <Link to="/admin" className="avatar" aria-label="Verwaltung">
          M
        </Link>
      </div>
    </header>
  );
}
