import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GearIcon, HeartIcon, EditIcon, ChevronR, CloseIcon } from './Icons.jsx';
import { ConversationRow } from './ConversationRow.jsx';
import { Card, StatsCard, QuickPost, MiniPost, cardVariants } from './sidebar/cards.jsx';
import { useMedia } from '../lib/useMedia.js';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDockState } from '../lib/dock.jsx';
import { useI18n } from '../lib/i18n.jsx';
import { useUnread } from '../lib/inbox.js';
import { useFavorites } from '../lib/store.js';

const KEY = 'mizax.sidebar';
const MOBILE = '(max-width: 1024px)';

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
                <span>{user ? t('sidebar.hello', { name: user.name.split(' ')[0] }) : t('sidebar.welcome')}</span>
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
                  <Card i={i++} title={t('feed.title')}>
                    <p className="side-text">{t('sidebar.feedGuest')}</p>
                  </Card>
                </>
              )}

              {user && (
                <>
                  <Card i={i++} title={t('msg.title')} badge={unread} to="/messages">
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

                  <Card i={i++} title={t('feed.title')} to="/feed">
                    {escort && (
                      <QuickPost
                        onPosted={(post) => setData((d) => d && { ...d, posts: [post, ...d.posts].slice(0, 2) })}
                      />
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
