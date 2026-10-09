import { motion } from 'framer-motion';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import PageHead from '../components/PageHead.jsx';
import Avatar from '../components/Avatar.jsx';
import { ConversationRow, otherLink } from '../components/ConversationRow.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { useToast } from '../components/Toast.jsx';
import { SendIcon, InboxIcon, ChevronR, DoubleCheckIcon, CheckIcon } from '../components/Icons.jsx';
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
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const lastRef = useRef(0);
  const animateFrom = useRef(Infinity);
  lastRef.current = messages?.length ? messages[messages.length - 1].id : 0;

  const scrollDown = (smooth) =>
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
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
  }, [id, user]);

  // neue Nachrichten und Lesestatus regelmäßig abholen
  const loaded = messages !== null;
  useEffect(() => {
    if (!loaded) return undefined;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await api(`/api/messages/${id}?after=${lastRef.current}`);
        setReadUpTo(r.readUpTo);
        if (r.messages.length) {
          const stick = nearBottom();
          setMessages((m) => merge(m || [], r.messages));
          refreshUnread();
          if (stick) scrollDown(true);
        }
      } catch {
        /* offline */
      }
    };
    const timer = window.setInterval(tick, 4000);
    return () => window.clearInterval(timer);
  }, [id, loaded]);

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

  const link = conv && otherLink(conv.other, user);
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
              </Rise>
            )}
          </div>
        </div>
      )}

      <div className="chat-list">
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
                className={`msg ${m.mine ? 'mine' : 'theirs'} ${end ? 'end' : ''}`}
                initial={fresh ? { opacity: 0, y: 10, scale: 0.96 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              >
                {m.body}
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
      </div>

      <div className="dock-wrap chat-dock">
        <form className="dock" onSubmit={send}>
          <div className="dock-bar">
            <div className="dock-input-wrap">
              <textarea
                ref={inputRef}
                className="dock-input chat-input"
                rows={1}
                value={body}
                maxLength={2000}
                placeholder={conv ? t('dock.messageTo', { name: conv.other.name }) : ''}
                onChange={(e) => setBody(e.target.value)}
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
    </Page>
  );
}
