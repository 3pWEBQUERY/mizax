import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import BarChart from './BarChart.jsx';
import { useToast } from './Toast.jsx';
import { useOwnEscort } from './Feed.jsx';
import {
  InboxIcon, ChartIcon, FeedIcon, GearIcon, HeartIcon, EditIcon, ChevronR, CloseIcon, ImageIcon, SpinnerIcon,
} from './Icons.jsx';
import { ConversationRow } from '../pages/Messages.jsx';
import { Delta } from '../pages/Stats.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDockState } from '../lib/dock.jsx';
import { useI18n, errorText } from '../lib/i18n.jsx';
import { useUnread } from '../lib/inbox.js';
import { useFavorites } from '../lib/store.js';
import { formatNumber, timeAgo } from '../lib/time.js';

const KEY = 'mizax.sidebar';
const MOBILE = '(max-width: 1024px)';

export function useMedia(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

const cardVariants = {
  hidden: { opacity: 0, x: -24, scale: 0.97, filter: 'blur(6px)' },
  show: (i) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 320, damping: 32, delay: 0.05 + i * 0.06 },
  }),
  exit: { opacity: 0, x: -16, transition: { duration: 0.18 } },
};

function Card({ i, icon: Icon, title, badge, to, toLabel, children, className = '' }) {
  return (
    <motion.section className={`side-card ${className}`} variants={cardVariants} custom={i} initial="hidden" animate="show" exit="exit">
      {title && (
        <header className="side-card-head">
          <h3>{title}</h3>
          {badge > 0 && <span className="count-badge">{badge}</span>}
          {to && (
            <Link to={to} className="side-card-link" aria-label={toLabel || title}>
              <ChevronR width={16} height={16} />
            </Link>
          )}
        </header>
      )}
      {children}
    </motion.section>
  );
}

function MiniStat({ label, value }) {
  const { locale } = useI18n();
  return (
    <div className="mini-stat">
      <b>{formatNumber(value, locale)}</b>
      <span>{label}</span>
    </div>
  );
}

function StatsCard({ i, stats }) {
  const { t, locale } = useI18n();
  const T = stats?.totals;
  const escort = stats?.role === 'escort';
  if (escort && !stats.profile) {
    return (
      <Card i={i} icon={ChartIcon} title={t('stats.title')}>
        <p className="side-text">{t('stats.noProfile')}</p>
        <Link to="/me" className="small-btn side-small">
          {t('menu.myProfile')}
          <ChevronR width={14} height={14} />
        </Link>
      </Card>
    );
  }
  const main = escort ? T?.views : T?.visits;
  const prev = escort ? T?.prevViews : T?.prevVisits;
  return (
    <Card i={i} icon={ChartIcon} title={t('stats.title')} to="/stats">
      {T ? (
        <>
          <div className="side-kpi">
            <b>{formatNumber(main, locale)}</b>
            <span>
              {escort ? t('sidebar.views14') : t('sidebar.visits14')}
              <Delta now={main} prev={prev} />
            </span>
          </div>
          {stats.series.some((d) => d.value > 0) ? (
            <BarChart data={stats.series} label={escort ? t('stats.viewsUnit') : t('stats.visitsUnit')} height={64} compact />
          ) : (
            <div className="side-empty-chart">
              <ChartIcon width={18} height={18} />
              {escort ? t('sidebar.noViews') : t('sidebar.noVisits')}
            </div>
          )}
          <div className="mini-stats">
            {escort ? (
              <>
                <MiniStat label={t('stats.visitors')} value={T.visitors} />
                <MiniStat label={t('stats.favorites')} value={T.favorites} />
                <MiniStat label={t('stats.messages')} value={T.messages} />
              </>
            ) : (
              <>
                <MiniStat label={t('stats.favorites')} value={T.favorites} />
                <MiniStat label={t('stats.viewed')} value={T.viewed} />
                <MiniStat label={t('stats.conversationsTile')} value={T.conversations} />
              </>
            )}
          </div>
        </>
      ) : (
        <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
      )}
    </Card>
  );
}

function QuickPost({ onPosted }) {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const own = useOwnEscort();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [body]);

  if (!own) {
    return (
      <>
        <p className="side-text">{t('feed.needProfile')}</p>
        <Link to="/me" className="small-btn side-small">
          {t('menu.myProfile')}
          <ChevronR width={14} height={14} />
        </Link>
      </>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    const form = new FormData();
    form.append('body', body.trim());
    try {
      const post = await api('/api/me/posts', { method: 'POST', form });
      setBody('');
      toast(t('feed.posted'));
      onPosted(post);
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="quick-post" onSubmit={submit}>
      <textarea
        ref={ref}
        rows={2}
        value={body}
        maxLength={5000}
        placeholder={t('feed.placeholder', { name: own.name })}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="quick-post-bar">
        <button type="button" className="quick-post-tool" onClick={() => navigate('/feed?compose=1')} aria-label={t('feed.addPhotos')}>
          <ImageIcon width={18} height={18} />
        </button>
        <button type="submit" className="small-btn" disabled={!body.trim() || busy}>
          {busy && <SpinnerIcon width={14} height={14} className="spin" />}
          {t('feed.post')}
        </button>
      </div>
    </form>
  );
}

function MiniPost({ p }) {
  const { locale } = useI18n();
  return (
    <Link to="/feed" className="mini-post">
      <Avatar name={p.author.name} thumb={p.author.thumb} size={34} />
      <span className="mini-post-main">
        <span className="mini-post-top">
          <b>{p.author.name}</b>
          <small>{timeAgo(p.createdAt, locale, 'short')}</small>
        </span>
        {p.body && <span className="mini-post-text">{p.body}</span>}
      </span>
      {p.photos[0] && <img className="mini-post-img" src={p.photos[0].thumb} alt="" loading="lazy" />}
    </Link>
  );
}

export default function Sidebar() {
  const { sidebarOpen: open, setSidebarOpen } = useDockState();
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const mobile = useMedia(MOBILE);
  const unread = useUnread();
  const favs = useFavorites();
  const [data, setData] = useState(null);
  const userId = user?.id;

  // Desktop: Zustand merken
  useEffect(() => {
    try {
      if (!window.matchMedia(MOBILE).matches && localStorage.getItem(KEY) === '1') setSidebarOpen(true);
    } catch {
      /* ignore */
    }
  }, [setSidebarOpen]);

  useEffect(() => {
    if (mobile) return;
    try {
      localStorage.setItem(KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open, mobile]);

  // Mobil: beim Seitenwechsel schließen
  useEffect(() => {
    if (mobile) setSidebarOpen(false);
  }, [pathname, mobile, setSidebarOpen]);

  useEffect(() => {
    if (!open || !mobile) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSidebarOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, mobile, setSidebarOpen]);

  useEffect(() => setData(null), [userId]);

  useEffect(() => {
    if (!open || !userId) return undefined;
    let alive = true;
    const load = () =>
      api('/api/me/overview')
        .then((d) => alive && setData(d))
        .catch(() => {});
    load();
    const timer = window.setInterval(() => document.visibilityState === 'visible' && load(), 60000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [open, userId, unread]);

  const escort = user?.role === 'escort';
  const close = () => setSidebarOpen(false);
  let i = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {mobile && (
            <motion.div
              key="scrim"
              className="sidebar-scrim"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
          <motion.aside
            key="sidebar"
            className="sidebar"
            aria-label={t('sidebar.label')}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30, transition: { duration: 0.22 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
          >
            <div className="sidebar-scroll">
              <motion.div className="sidebar-head" variants={cardVariants} custom={i++} initial="hidden" animate="show">
                <span>
                  {user ? t('sidebar.hello', { name: user.name.split(' ')[0] }) : t('sidebar.welcome')}
                </span>
                <button type="button" className="icon-btn sm" onClick={close} aria-label={t('profile.close')}>
                  <CloseIcon width={16} height={16} />
                </button>
              </motion.div>

              {ready && !user && (
                <>
                  <Card i={i++} className="side-welcome">
                    <h3>{t('sidebar.guestTitle')}</h3>
                    <p className="side-text">{t('sidebar.guestText')}</p>
                    <div className="side-actions">
                      <Link to="/register" className="status-pill">
                        {t('menu.register')}
                      </Link>
                      <Link to="/login" className="small-btn">
                        {t('menu.login')}
                        <ChevronR width={14} height={14} />
                      </Link>
                    </div>
                  </Card>
                  <Card i={i++} icon={FeedIcon} title={t('feed.title')}>
                    <p className="side-text">{t('sidebar.feedGuest')}</p>
                  </Card>
                </>
              )}

              {user && (
                <>
                  <Card i={i++} icon={InboxIcon} title={t('msg.title')} badge={unread} to="/messages">
                    {data ? (
                      data.conversations.length ? (
                        <div className="side-list">
                          {data.conversations.map((c) => (
                            <ConversationRow key={c.id} c={c} compact />
                          ))}
                        </div>
                      ) : (
                        <p className="side-text">{escort ? t('msg.emptyEscort') : t('msg.emptyMember')}</p>
                      )
                    ) : (
                      <div className="skeleton" style={{ height: 96, borderRadius: 16 }} />
                    )}
                  </Card>

                  <StatsCard i={i++} stats={data?.stats} />

                  <Card i={i++} icon={FeedIcon} title={t('feed.title')} to="/feed">
                    {escort && (
                      <QuickPost onPosted={(post) => setData((d) => d && { ...d, posts: [post, ...d.posts].slice(0, 2) })} />
                    )}
                    {data?.posts?.length ? (
                      <div className="side-list">
                        {data.posts.map((p) => (
                          <MiniPost key={p.id} p={p} />
                        ))}
                      </div>
                    ) : (
                      data && !escort && <p className="side-text">{t('feed.empty')}</p>
                    )}
                  </Card>

                  <Card i={i++} className="side-links">
                    {escort && (
                      <Link to="/me" className="settings-row">
                        <span className="settings-icon">
                          <EditIcon width={18} height={18} />
                        </span>
                        <span className="settings-label">{t('menu.myProfile')}</span>
                        <ChevronR width={16} height={16} className="settings-chev" />
                      </Link>
                    )}
                    <Link to="/favorites" className="settings-row">
                      <span className="settings-icon">
                        <HeartIcon width={18} height={18} />
                      </span>
                      <span className="settings-label">{t('menu.favorites')}</span>
                      {favs.size > 0 && <span className="settings-value">{favs.size}</span>}
                      <ChevronR width={16} height={16} className="settings-chev" />
                    </Link>
                    <Link to="/settings" className="settings-row">
                      <span className="settings-icon">
                        <GearIcon width={18} height={18} />
                      </span>
                      <span className="settings-label">{t('settings.title')}</span>
                      <ChevronR width={16} height={16} className="settings-chev" />
                    </Link>
                  </Card>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
