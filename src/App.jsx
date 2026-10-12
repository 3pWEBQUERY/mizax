import { AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import TopBar from './components/TopBar.jsx';
import Clock from './components/Clock.jsx';
import Dock from './components/Dock.jsx';
import AgeGate from './components/AgeGate.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useMedia } from './lib/useMedia.js';
import { ToastProvider } from './components/Toast.jsx';
import { ReportProvider } from './components/Report.jsx';
import { DockProvider, useDockState } from './lib/dock.jsx';
import { I18nProvider } from './lib/i18n.jsx';
import { ThemeProvider } from './lib/theme.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { loadEscorts } from './lib/store.js';
import Home from './pages/Home.jsx';
import Favorites from './pages/Favorites.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';
import Page from './components/Page.jsx';
import { Privacy, Terms } from './pages/Legal.jsx';

// Startseite, Favoriten und Profile sind sofort da; alle übrigen Seiten werden erst bei Bedarf
// (bzw. kurz nach dem Start im Leerlauf) geladen, damit der erste Aufruf schneller ist.
const chunks = {
  admin: () => import('./pages/Admin.jsx'),
  me: () => import('./pages/MyProfile.jsx'),
  auth: () => import('./pages/Auth.jsx'),
  feed: () => import('./pages/Feed.jsx'),
  messages: () => import('./pages/Messages.jsx'),
  stats: () => import('./pages/Stats.jsx'),
  settings: () => import('./pages/settings/Settings.jsx'),
  member: () => import('./pages/Member.jsx'),
  suggestions: () => import('./pages/Suggestions.jsx'),
  password: () => import('./pages/PasswordReset.jsx'),
};

function lazyPage(chunk, name = 'default') {
  const Component = lazy(() => chunk().then((m) => ({ default: m[name] })));
  return function LazyPage(props) {
    return (
      <Suspense fallback={<Page />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

const Admin = lazyPage(chunks.admin);
const MyProfile = lazyPage(chunks.me);
const Login = lazyPage(chunks.auth, 'Login');
const Register = lazyPage(chunks.auth, 'Register');
const FeedPage = lazyPage(chunks.feed);
const Messages = lazyPage(chunks.messages, 'Messages');
const Chat = lazyPage(chunks.messages, 'Chat');
const Stats = lazyPage(chunks.stats);
const Settings = lazyPage(chunks.settings);
const Member = lazyPage(chunks.member);
const Suggestions = lazyPage(chunks.suggestions);
const Forgot = lazyPage(chunks.password, 'Forgot');
const Reset = lazyPage(chunks.password, 'Reset');

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
    // übrige Seiten im Leerlauf vorladen, damit spätere Wechsel ohne Wartezeit laufen
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 2500));
    const id = idle(() => Object.values(chunks).forEach((load) => load().catch(() => {})));
    return () => (window.cancelIdleCallback || clearTimeout)(id);
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
              <Route path="/forgot" element={<Forgot />} />
              <Route path="/reset" element={<Reset />} />
              <Route path="/me" element={<MyProfile />} />
              <Route path="/me/services" element={<MyProfile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/datenschutz" element={<Privacy />} />
              <Route path="/agb" element={<Terms />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:id" element={<Chat />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/suggestions" element={<Suggestions />} />
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
                <ReportProvider>
                  <Shell />
                </ReportProvider>
              </DockProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </MotionConfig>
  );
}
