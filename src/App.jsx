import { AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import TopBar from './components/TopBar.jsx';
import Clock from './components/Clock.jsx';
import Dock from './components/Dock.jsx';
import AgeGate from './components/AgeGate.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { DockProvider, useDockState } from './lib/dock.jsx';
import { loadEscorts } from './lib/store.js';
import Home from './pages/Home.jsx';
import Favorites from './pages/Favorites.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

function Backdrop() {
  return <div className="backdrop" aria-hidden="true" />;
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { inputRef, config } = useDockState();

  // Profile sofort im Hintergrund laden, damit jeder Seitenwechsel ohne Wartezeit läuft
  useEffect(() => {
    loadEscorts().catch(() => {});
  }, []);

  const focusSearch = () => {
    if (config.mode !== 'search') navigate('/');
    setTimeout(() => inputRef.current?.focus(), config.mode !== 'search' ? 350 : 0);
  };

  // Seiten-Schlüssel: Profile untereinander teilen sich keinen Schlüssel,
  // damit auch Profil → Profil weich überblendet.
  const pageKey = location.pathname;

  return (
    <div className="app">
      <Backdrop />
      <Clock />
      <TopBar onSearch={focusSearch} />
      <LayoutGroup>
        <div className="pages">
          <AnimatePresence initial={false}>
            <Routes location={location} key={pageKey}>
              <Route path="/" element={<Home />} />
              <Route path="/favoriten" element={<Favorites />} />
              <Route path="/escort/:slug" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </div>
      </LayoutGroup>
      <Dock />
      <AgeGate />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <DockProvider>
          <Shell />
        </DockProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
