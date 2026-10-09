import { AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import TopBar from './components/TopBar.jsx';
import Clock from './components/Clock.jsx';
import Dock from './components/Dock.jsx';
import AgeGate from './components/AgeGate.jsx';
import Sidebar, { useMedia } from './components/Sidebar.jsx';
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
import { Privacy, Terms } from './pages/Legal.jsx';
import FeedPage from './pages/Feed.jsx';
import { Messages, Chat } from './pages/Messages.jsx';
import Stats from './pages/Stats.jsx';
import Settings from './pages/Settings.jsx';
import Member from './pages/Member.jsx';

// Unterseiten, die beim Wechsel innerhalb desselben Bereichs nicht neu eingeblendet werden
function routeKey(pathname) {
  if (pathname.startsWith('/me')) return '/me';
  if (pathname.startsWith('/settings')) return '/settings';
  return pathname;
}

function Backdrop() {
  return <div className="backdrop" aria-hidden="true" />;
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, searchOpen, setSearchOpen, sidebarOpen } = useDockState();
  const overlay = useMedia('(max-width: 1024px)');

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
    <div className={`app ${sidebarOpen && !overlay ? 'sidebar-on' : ''}`}>
      <Backdrop />
      <Clock />
      <TopBar onSearch={toggleSearch} searchOpen={searchOpen} />
      <LayoutGroup>
        <div className="pages">
          <AnimatePresence initial={false}>
            <Routes location={location} key={routeKey(location.pathname)}>
              <Route path="/" element={<Home />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/favoriten" element={<Navigate to="/favorites" replace />} />
              <Route path="/escort/:slug" element={<Profile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/me" element={<MyProfile />} />
              <Route path="/me/services" element={<MyProfile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/datenschutz" element={<Privacy />} />
              <Route path="/agb" element={<Terms />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:id" element={<Chat />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/:section" element={<Settings />} />
              <Route path="/member/:id" element={<Member />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </div>
      </LayoutGroup>
      <Sidebar />
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
