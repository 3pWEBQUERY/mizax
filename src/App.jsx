import { AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import TopBar from './components/TopBar.jsx';
import Clock from './components/Clock.jsx';
import Dock from './components/Dock.jsx';
import AgeGate from './components/AgeGate.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { DockProvider, useDockState } from './lib/dock.jsx';
import { I18nProvider } from './lib/i18n.jsx';
import { ThemeProvider } from './lib/theme.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { loadEscorts } from './lib/store.js';
import Home from './pages/Home.jsx';
import Favorites from './pages/Favorites.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import MyProfile from './pages/MyProfile.jsx';
import NotFound from './pages/NotFound.jsx';
import { Login, Register } from './pages/Auth.jsx';

function Backdrop() {
  return <div className="backdrop" aria-hidden="true" />;
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, searchOpen, setSearchOpen } = useDockState();

  // Profile sofort im Hintergrund laden, damit jeder Seitenwechsel ohne Wartezeit läuft
  useEffect(() => {
    loadEscorts().catch(() => {});
  }, []);

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchOpen(false);
      return;
    }
    if (config.mode !== 'search') navigate('/');
    setSearchOpen(true);
  };

  return (
    <div className="app">
      <Backdrop />
      <Clock />
      <TopBar onSearch={toggleSearch} searchOpen={searchOpen} />
      <LayoutGroup>
        <div className="pages">
          <AnimatePresence initial={false}>
            <Routes location={location} key={location.pathname.startsWith('/me') ? '/me' : location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/favoriten" element={<Navigate to="/favorites" replace />} />
              <Route path="/escort/:slug" element={<Profile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/me" element={<MyProfile />} />
              <Route path="/me/services" element={<MyProfile />} />
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
      <I18nProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <DockProvider>
                <Shell />
              </DockProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </MotionConfig>
  );
}
