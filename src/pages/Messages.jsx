import { AnimatePresence, motion } from 'framer-motion';
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import PageHead from '../components/PageHead.jsx';
import Avatar from '../components/Avatar.jsx';
import { ConversationRow, otherLink } from '../components/ConversationRow.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  SendIcon,
  InboxIcon,
  ChevronR,
  DoubleCheckIcon,
  CheckIcon,
  StarIcon,
  BlockIcon,
  ImageIcon,
  SpinnerIcon,
} from '../components/Icons.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { onLive } from '../lib/live.js';
import ProfileMenu from '../components/ProfileMenu.jsx';
import { unblock } from '../lib/blocks.js';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { useI18n, errorText } from '../lib/i18n.jsx';
import { refreshUnread, useUnread } from '../lib/inbox.js';
import { clockTime, dayLabel, sameDay } from '../lib/time.js';

export function Messages() {
  useDock({ mode: 'hidden' });
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const unread = useUnread();
  const [list, setList] = useState(null);

  useEffect(() => {
    if (!user) return;
    api('/api/messages')
      .then(setList)
      .catch(() => setList([]));
  }, [user, unread]);

  if (ready && !user) return <Navigate to="/login" replace state={{ from: '/messages' }} />;

  return (
    <Page>
      <PageHead title={t('msg.title')} text={user?.role === 'escort' ? t('msg.introEscort') : t('msg.introMember')}>
        {unread > 0 && (
          <span className="status-pill">
            <span className="count-badge">{unread}</span>
            {t('msg.unreadLabel')}
          </span>
        )}
      </PageHead>
      <Rise i={3} className="panel conv-panel">
        {list === null ? (
          [0, 1, 2].map((k) => (
            <div key={k} className="conv-row">
              <span className="person skeleton" style={{ width: 48, height: 48 }} />
              <span className="conv-main">
                <span className="skeleton-line" style={{ width: '35%' }} />
                <span className="skeleton-line" style={{ width: '70%' }} />
              </span>
            </div>
          ))
        ) : list.length ? (
          list.map((c) => <ConversationRow key={c.id} c={c} />)
        ) : (
          <div className="conv-empty">
            <span className="settings-icon">
              <InboxIcon />
            </span>
            <b>{t('msg.empty')}</b>
            <p>{user?.role === 'escort' ? t('msg.emptyEscort') : t('msg.emptyMember')}</p>
            {user?.role !== 'escort' && (
              <Link to="/" className="small-btn">
                {t('fav.discover')}
                <ChevronR width={14} height={14} />
              </Link>
            )}
          </div>
        )}
      </Rise>
    </Page>
  );
}

function merge(list, incoming) {
  const seen = new Set(list.map((m) => m.id));
  return [...list, ...incoming.filter((m) => !seen.has(m.id))].sort((a, b) => a.id - b.id);
}

export function Chat() {
  const { id } = useParams();
  useDock({ mode: 'hidden' });
  const { t, locale } = useI18n();
  const { user, ready } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState(null);
  const [readUpTo, setReadUpTo] = useState(0);
  const [error, setError] = useState(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [zoom, setZoom] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const typingSent = useRef(0);
  const lastRef = useRef(0);
  const animateFrom = useRef(Infinity);
  lastRef.current = messages?.length ? messages[messages.length - 1].id : 0;
  const loadedOnce = messages !== null;

  // Scrollen erst nach dem Zeichnen der neuen Nachrichten (siehe useLayoutEffect unten)
  const scrollRequest = useRef(null);
  const scrollNow = useCallback((smooth) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);
  const scrollDown = useCallback(
    (smooth) => {
      scrollRequest.current = smooth;
      requestAnimationFrame(() => scrollRequest.current !== null && scrollNow(smooth));
    },
    [scrollNow],
  );

  useLayoutEffect(() => {
    if (scrollRequest.current === null) return;
    scrollNow(scrollRequest.current);
    scrollRequest.current = null;
  });

  // wer unten ist, bleibt unten – auch wenn Fotos nachladen oder die Tippanzeige erscheint
  const listRef = useRef(null);
  const pinned = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    const list = listRef.current;
    if (!el || !list || typeof ResizeObserver === 'undefined') return undefined;
    const onScroll = () => {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    };
    const ro = new ResizeObserver(() => pinned.current && scrollNow(false));
    el.addEventListener('scroll', onScroll, { passive: true });
    ro.observe(list);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [loadedOnce, scrollNow]);
  const nearBottom = () => {
    const el = scrollRef.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    setMessages(null);
    setError(null);
    api(`/api/messages/${id}`)
      .then((r) => {
        if (!alive) return;
        setConv(r.conversation);
        animateFrom.current = r.messages.length ? r.messages[r.messages.length - 1].id : 0;
        setMessages(r.messages);
        setReadUpTo(r.readUpTo);
        refreshUnread();
        scrollDown(false);
      })
      .catch((err) => alive && setError(err));
    return () => {
      alive = false;
    };
  }, [id, user, scrollDown]);

  // neue Nachrichten und Lesestatus abholen: sofort bei einem Echtzeit-Ereignis,
  // zusätzlich alle 15 Sekunden als Rückfall (z. B. nach einem Verbindungsabbruch)
  const loaded = messages !== null;
  const tick = useCallback(async () => {
    try {
      const r = await api(`/api/messages/${id}?after=${lastRef.current}`);
      setReadUpTo(r.readUpTo);
      if (r.messages.length) {
        const stick = nearBottom();
        setMessages((m) => merge(m || [], r.messages));
        if (r.messages.some((m) => !m.mine)) setTyping(false);
        refreshUnread();
        if (stick) scrollDown(true);
      }
    } catch {
      /* offline */
    }
  }, [id, scrollDown]);

  useEffect(() => {
    if (!loaded) return undefined;
    const mine = (d) => String(d.conversationId) === String(id);
    const offs = [
      onLive('message', (d) => mine(d) && tick()),
      onLive('read', (d) => mine(d) && tick()),
      onLive('typing', (d) => mine(d) && setTyping(Date.now())),
    ];
    const timer = window.setInterval(() => document.visibilityState === 'visible' && tick(), 15000);
    return () => {
      offs.forEach((off) => off());
      window.clearInterval(timer);
    };
  }, [id, loaded, tick]);

  // Tippanzeige nach 5 Sekunden ohne neues Signal ausblenden
  useEffect(() => {
    if (!typing) return undefined;
    const t = window.setTimeout(() => setTyping(false), 5000);
    return () => window.clearTimeout(t);
  }, [typing]);

  function signalTyping() {
    if (Date.now() - typingSent.current < 3000) return;
    typingSent.current = Date.now();
    api(`/api/messages/${id}/typing`, { method: 'POST' }).catch(() => {});
  }

  async function sendPhoto(file) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photos', file);
      if (body.trim()) form.append('body', body.trim());
      const m = await api(`/api/messages/${id}/photo`, { method: 'POST', form });
      setMessages((list) => merge(list || [], [m]));
      setBody('');
      scrollDown(true);
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function send(e) {
    e?.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const m = await api(`/api/messages/${id}`, { method: 'POST', body: { body: text } });
      setMessages((list) => merge(list || [], [m]));
      setBody('');
      scrollDown(true);
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [body]);

  if (ready && !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (error) {
    return (
      <Page>
        <div className="bubbles">
          <Bubble i={0}>{errorText(t, error)}</Bubble>
          <Rise i={1}>
            <Link to="/messages" className="white-btn">
              {t('msg.back')}
            </Link>
          </Rise>
        </div>
      </Page>
    );
  }

  const link = conv && otherLink(conv.other);
  const lastMine = messages ? [...messages].reverse().find((m) => m.mine) : null;

  return (
    <Page className="chat-page" scrollRef={scrollRef}>
      {conv && (
        <div className="me-head member-head chat-head">
          <Rise i={0}>
            {link ? (
              <Link to={link} aria-label={conv.other.name}>
                <Avatar name={conv.other.name} thumb={conv.other.thumb} size={52} />
              </Link>
            ) : (
              <Avatar name={conv.other.name} size={52} />
            )}
          </Rise>
          <div className="me-head-text">
            <Rise i={0} as="h1" className="me-title">
              {conv.other.name}
            </Rise>
            {link && (
              <Rise i={1} as="p" className="me-intro">
                <Link to={link} className="chat-profile-link">
                  {conv.other.kind === 'escort' ? t('msg.viewProfile') : t('msg.viewMember')}
                  <ChevronR width={12} height={12} />
                </Link>
                {/* Escorts können Mitglieder bewerten, Mitglieder Escorts – direkt aus dem Chat */}
                <Link to={`${link}?tab=reviews`} className="chat-profile-link">
                  <StarIcon width={12} height={12} />
                  {t('reviews.rateShort')}
                </Link>
              </Rise>
            )}
          </div>
          <Rise i={1} className="chat-head-menu">
            <ProfileMenu
              kind={conv.other.kind}
              targetId={conv.other.kind === 'escort' ? conv.other.escortId : conv.other.memberId}
              userId={conv.other.userId}
              name={conv.other.name}
              className="icon-btn"
              onBlockChange={(on) => setConv((c) => ({ ...c, blocked: on ? 'me' : null }))}
            />
          </Rise>
        </div>
      )}

      <div className="chat-list" ref={listRef}>
        {messages && !messages.length && <div className="chat-day">{t('msg.start')}</div>}
        {messages?.map((m, idx) => {
          const prev = messages[idx - 1];
          const next = messages[idx + 1];
          const newDay = !prev || !sameDay(prev.at, m.at);
          const end =
            !next || next.mine !== m.mine || !sameDay(next.at, m.at) || new Date(next.at) - new Date(m.at) > 5 * 60000;
          const fresh = m.id > animateFrom.current;
          return (
            <Fragment key={m.id}>
              {newDay && <div className="chat-day">{dayLabel(m.at, locale)}</div>}
              <motion.div
                className={`msg ${m.mine ? 'mine' : 'theirs'} ${end ? 'end' : ''} ${m.photo ? 'has-photo' : ''}`}
                initial={fresh ? { opacity: 0, y: 10, scale: 0.96 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              >
                {m.photo && (
                  <button
                    type="button"
                    className="msg-photo"
                    onClick={() => setZoom(m.photo)}
                    aria-label={t('msg.photo')}
                    style={m.photo.width ? { aspectRatio: `${m.photo.width} / ${m.photo.height}` } : undefined}
                  >
                    <img src={m.photo.thumb} alt="" loading="lazy" />
                  </button>
                )}
                {m.body && <span className="msg-text">{m.body}</span>}
              </motion.div>
              {end && (
                <div className={`msg-meta ${m.mine ? 'mine' : ''}`}>
                  {clockTime(m.at, locale)}
                  {m.mine && lastMine?.id === m.id && (
                    <span className={`msg-seen ${m.id <= readUpTo ? 'on' : ''}`}>
                      {m.id <= readUpTo ? <DoubleCheckIcon /> : <CheckIcon width={12} height={12} />}
                      {m.id <= readUpTo ? t('msg.seen') : t('msg.delivered')}
                    </span>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
        <AnimatePresence>
          {typing && conv && (
            <motion.div
              className="msg-typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              aria-live="polite"
            >
              <span className="typing-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {t('msg.typing', { name: conv.other.name })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {zoom && (
          <Lightbox
            photos={[zoom]}
            index={0}
            onIndex={() => {}}
            onClose={() => setZoom(null)}
            name={conv?.other.name || ''}
            t={t}
          />
        )}
      </AnimatePresence>

      {conv?.blocked ? (
        <div className="dock-wrap chat-dock">
          <div className="chat-blocked">
            <BlockIcon width={16} height={16} />
            <span>
              {conv.blocked === 'me'
                ? t('block.chatMine', { name: conv.other.name })
                : t('block.chatTheirs', { name: conv.other.name })}
            </span>
            {conv.blocked === 'me' && (
              <button
                type="button"
                className="status-pill"
                onClick={async () => {
                  try {
                    await unblock(conv.other.userId, user.id);
                    setConv((c) => ({ ...c, blocked: null }));
                  } catch (err) {
                    toast(errorText(t, err));
                  }
                }}
              >
                {t('block.unblock')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="dock-wrap chat-dock">
          <form className="dock" onSubmit={send}>
            <div className="dock-bar">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => sendPhoto(e.target.files?.[0])}
              />
              <button
                type="button"
                className="dock-btn chat-attach"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label={t('msg.sendPhoto')}
                title={t('msg.sendPhoto')}
              >
                {uploading ? <SpinnerIcon width={18} height={18} /> : <ImageIcon width={20} height={20} />}
              </button>
              <div className="dock-input-wrap">
                <textarea
                  ref={inputRef}
                  className="dock-input chat-input"
                  rows={1}
                  value={body}
                  maxLength={2000}
                  placeholder={conv ? t('dock.messageTo', { name: conv.other.name }) : ''}
                  onChange={(e) => {
                    setBody(e.target.value);
                    if (e.target.value) signalTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(hover: none)').matches) send(e);
                  }}
                  aria-label={t('msg.write')}
                />
              </div>
              <button
                type="submit"
                className="dock-btn send"
                disabled={!body.trim() || sending}
                aria-label={t('dock.send')}
              >
                <SendIcon width={20} height={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </Page>
  );
}
