import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../Avatar.jsx';
import { useToast } from '../Toast.jsx';
import { SendIcon } from '../Icons.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useI18n, errorText } from '../../lib/i18n.jsx';
import { timeAgo } from '../../lib/time.js';

// ---------- Kommentare ----------

function personLink(author, viewer) {
  if (author.kind === 'escort' && author.slug) return `/escort/${author.slug}`;
  if (author.memberId && viewer && (viewer.role === 'escort' || viewer.isAdmin || viewer.id === author.memberId)) {
    return `/member/${author.memberId}`;
  }
  return null;
}

function PersonName({ author, viewer }) {
  const to = personLink(author, viewer);
  return to ? <Link to={to}>{author.name}</Link> : <span>{author.name}</span>;
}

function Comment({ c, onDelete }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  return (
    <motion.div
      className="comment"
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <Avatar name={c.author.name} thumb={c.author.thumb} size={30} />
      <div className="comment-main">
        <div className="comment-bubble">
          <b>
            <PersonName author={c.author} viewer={user} />
          </b>
          <p>{c.body}</p>
        </div>
        <div className="comment-meta">
          <span>{timeAgo(c.at, locale, 'short')}</span>
          {c.canDelete && (
            <button type="button" onClick={() => onDelete(c)}>
              {t('feed.delete')}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Comments({ post, onCount, autoFocus }) {
  const { t } = useI18n();
  const toast = useToast();
  const [list, setList] = useState(post.comments);
  const [loaded, setLoaded] = useState(post.commentsCount <= post.comments.length);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  async function loadAll() {
    try {
      setList(await api(`/api/posts/${post.id}/comments`));
      setLoaded(true);
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  async function send(e) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const c = await api(`/api/posts/${post.id}/comments`, { method: 'POST', body: { body } });
      setList((l) => [...l, c]);
      setBody('');
      onCount(1);
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c) {
    if (!window.confirm(t('feed.confirmDeleteComment'))) return;
    try {
      await api(`/api/comments/${c.id}`, { method: 'DELETE' });
      setList((l) => l.filter((x) => x.id !== c.id));
      onCount(-1);
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  const hidden = post.commentsCount - list.length;
  return (
    <div className="comments">
      {!loaded && hidden > 0 && (
        <button type="button" className="comments-more" onClick={loadAll}>
          {t(hidden === 1 ? 'feed.showCommentsOne' : 'feed.showComments', { n: hidden })}
        </button>
      )}
      <AnimatePresence initial={false}>
        {list.map((c) => (
          <Comment key={c.id} c={c} onDelete={remove} />
        ))}
      </AnimatePresence>
      <form className="comment-form" onSubmit={send}>
        <input
          ref={inputRef}
          className="comment-input"
          value={body}
          maxLength={1000}
          placeholder={t('feed.commentPlaceholder')}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="comment-send" disabled={!body.trim() || busy} aria-label={t('dock.send')}>
          <SendIcon width={16} height={16} />
        </button>
      </form>
    </div>
  );
}
