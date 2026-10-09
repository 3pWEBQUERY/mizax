import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import Lightbox from './Lightbox.jsx';
import { useToast } from './Toast.jsx';
import {
  HeartIcon, CommentIcon, ImageIcon, MoreIcon, CloseIcon, SendIcon, CheckIcon, SpinnerIcon, TrashIcon, EditIcon,
} from './Icons.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useI18n, errorText } from '../lib/i18n.jsx';
import { useEscorts } from '../lib/store.js';
import { timeAgo } from '../lib/time.js';

const MAX_PHOTOS = 6;
const spring = { type: 'spring', stiffness: 380, damping: 30 };

// eigenes Escort-Profil (für Profilbild und Namen im Composer)
export function useOwnEscort() {
  const { user } = useAuth();
  const { escorts } = useEscorts();
  return useMemo(() => (user && escorts ? escorts.find((e) => e.userId === user.id) || null : null), [user, escorts]);
}

function useAutosize(ref, value) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}

// ---------- Beitrag verfassen ----------

export function Composer({ onPosted, autoFocus = false }) {
  const { t } = useI18n();
  const toast = useToast();
  const own = useOwnEscort();
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(autoFocus);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  useAutosize(inputRef, body);

  const previews = useMemo(() => files.map((f) => ({ f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function addFiles(list) {
    const images = Array.from(list || []).filter((f) => /^image\//.test(f.type));
    const next = [...files, ...images].slice(0, MAX_PHOTOS);
    if (files.length + images.length > MAX_PHOTOS) toast(t('feed.maxPhotos', { n: MAX_PHOTOS }));
    setFiles(next);
    setFocused(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (busy || (!body.trim() && !files.length)) return;
    setBusy(true);
    const form = new FormData();
    form.append('body', body.trim());
    files.forEach((f) => form.append('photos', f));
    try {
      const post = await api('/api/me/posts', { method: 'POST', form });
      setBody('');
      setFiles([]);
      setFocused(false);
      toast(t('feed.posted'));
      onPosted?.(post);
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  if (!own) {
    return (
      <div className="post-card composer composer-empty">
        <p>{t('feed.needProfile')}</p>
        <Link to="/me" className="small-btn">
          {t('menu.myProfile')}
        </Link>
      </div>
    );
  }

  const open = focused || body || files.length;
  return (
    <form className={`post-card composer ${open ? 'open' : ''}`} onSubmit={submit}>
      <div className="composer-row">
        <Avatar name={own.name || user?.name} thumb={own.photos?.[0]?.thumb} size={42} />
        <textarea
          ref={inputRef}
          className="composer-input"
          rows={1}
          value={body}
          maxLength={5000}
          placeholder={t('feed.placeholder', { name: own.name })}
          onFocus={() => setFocused(true)}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <AnimatePresence initial={false}>
        {previews.length > 0 && (
          <motion.div
            className="composer-previews"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {previews.map((p, i) => (
              <div className="composer-thumb" key={p.url}>
                <img src={p.url} alt="" />
                <button
                  type="button"
                  aria-label={t('editor.deletePhoto')}
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                >
                  <CloseIcon width={14} height={14} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="composer-bar">
        <button
          type="button"
          className="composer-tool"
          onClick={() => fileRef.current?.click()}
          disabled={files.length >= MAX_PHOTOS}
        >
          <ImageIcon width={20} height={20} />
          <span>{t('feed.addPhotos')}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button type="submit" className="small-btn composer-submit" disabled={busy || (!body.trim() && !files.length)}>
          {busy ? <SpinnerIcon width={14} height={14} className="spin" /> : null}
          {t('feed.post')}
        </button>
      </div>
    </form>
  );
}

// ---------- Fotos im Beitrag ----------

function PhotoGrid({ photos, onOpen }) {
  const shown = photos.slice(0, 4);
  const more = photos.length - shown.length;
  return (
    <div className={`post-photos n${Math.min(photos.length, 4)}`}>
      {shown.map((p, i) => (
        <button type="button" key={p.id} className="post-photo" onClick={() => onOpen(i)}>
          <img src={photos.length === 1 ? p.url : p.thumb} alt="" loading="lazy" />
          {i === shown.length - 1 && more > 0 && <span className="post-more">+{more}</span>}
        </button>
      ))}
    </div>
  );
}

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
    <motion.div className="comment" layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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

function Comments({ post, onCount, autoFocus }) {
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

// ---------- Beitrag ----------

export function PostCard({ post: initial, onDeleted, i = 0 }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [post, setPost] = useState(initial);
  const [showComments, setShowComments] = useState(initial.comments.length > 0);
  const [focusComment, setFocusComment] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [lightbox, setLightbox] = useState(null);
  const [pop, setPop] = useState(0);
  const menuRef = useRef(null);
  const editRef = useRef(null);
  useAutosize(editRef, editing ? draft : '');

  useEffect(() => {
    if (!menu) return;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenu(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);

  async function like() {
    const liked = !post.liked;
    setPost((p) => ({ ...p, liked, likes: p.likes + (liked ? 1 : -1) }));
    if (liked) setPop((n) => n + 1);
    try {
      const r = await api(`/api/posts/${post.id}/like`, { method: 'POST' });
      setPost((p) => ({ ...p, liked: r.liked, likes: r.likes }));
    } catch (err) {
      setPost((p) => ({ ...p, liked: !liked, likes: p.likes + (liked ? -1 : 1) }));
      toast(errorText(t, err));
    }
  }

  async function remove() {
    setMenu(false);
    if (!window.confirm(t('feed.confirmDelete'))) return;
    try {
      await api(`/api/posts/${post.id}`, { method: 'DELETE' });
      toast(t('feed.deleted'));
      onDeleted?.(post.id);
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  async function saveEdit() {
    try {
      const p = await api(`/api/posts/${post.id}`, { method: 'PUT', body: { body: draft } });
      setPost((old) => ({ ...p, comments: old.comments }));
      setEditing(false);
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  const long = post.body.length > 420 && !expanded;
  const a = post.author;

  return (
    <motion.article
      className="post-card"
      layout="position"
      initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 4) * 0.06 }}
    >
      <header className="post-head">
        <Link to={`/escort/${a.slug}`} className="post-author">
          <Avatar name={a.name} thumb={a.thumb} size={44} />
          <span>
            <b>
              {a.name}
              {a.verified && (
                <span className="verified-tick" title={t('card.verified')}>
                  <CheckIcon width={10} height={10} />
                </span>
              )}
            </b>
            <small>
              {timeAgo(post.createdAt, locale)}
              {post.edited ? ` · ${t('feed.edited')}` : ''}
            </small>
          </span>
        </Link>
        {post.canDelete && (
          <div className="post-menu-anchor" ref={menuRef}>
            <button type="button" className="post-menu-btn" aria-label={t('feed.options')} onClick={() => setMenu(!menu)}>
              <MoreIcon />
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  className="menu post-menu"
                  initial={{ opacity: 0, scale: 0.94, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={spring}
                >
                  {post.mine && (
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => {
                        setMenu(false);
                        setDraft(post.body);
                        setEditing(true);
                      }}
                    >
                      <EditIcon /> {t('feed.edit')}
                    </button>
                  )}
                  <button type="button" className="menu-item danger" onClick={remove}>
                    <TrashIcon /> {t('feed.delete')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      {editing ? (
        <div className="post-edit">
          <textarea ref={editRef} className="composer-input" value={draft} maxLength={5000} onChange={(e) => setDraft(e.target.value)} />
          <div className="post-edit-bar">
            <button type="button" className="status-pill" onClick={() => setEditing(false)}>
              {t('feed.cancel')}
            </button>
            <button type="button" className="small-btn" onClick={saveEdit}>
              {t('editor.save')}
            </button>
          </div>
        </div>
      ) : (
        post.body && (
          <div className={`post-body ${long ? 'clamped' : ''}`}>
            {post.body}
            {long && (
              <button type="button" className="post-expand" onClick={() => setExpanded(true)}>
                {t('feed.more')}
              </button>
            )}
          </div>
        )
      )}

      {post.photos.length > 0 && <PhotoGrid photos={post.photos} onOpen={setLightbox} />}

      {(post.likes > 0 || post.commentsCount > 0) && (
        <div className="post-counts">
          {post.likes > 0 && (
            <span className="post-likes">
              <span className="like-badge">
                <HeartIcon filled width={11} height={11} />
              </span>
              {post.likes}
            </span>
          )}
          {post.commentsCount > 0 && (
            <button type="button" onClick={() => setShowComments((s) => !s)}>
              {t(post.commentsCount === 1 ? 'feed.commentsOne' : 'feed.comments', { n: post.commentsCount })}
            </button>
          )}
        </div>
      )}

      <div className="post-actions">
        <button type="button" className={post.liked ? 'liked' : ''} onClick={like} aria-pressed={post.liked}>
          <motion.span key={pop} initial={pop ? { scale: 0.6 } : false} animate={{ scale: [0.6, 1.3, 1] }} transition={{ duration: 0.45 }} style={{ display: 'grid' }}>
            <HeartIcon filled={post.liked} width={19} height={19} />
          </motion.span>
          {t('feed.like')}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowComments(true);
            setFocusComment((n) => n + 1);
          }}
        >
          <CommentIcon width={19} height={19} />
          {t('feed.comment')}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <Comments
              post={post}
              autoFocus={focusComment}
              onCount={(d) => setPost((p) => ({ ...p, commentsCount: p.commentsCount + d }))}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox != null && (
          <Lightbox
            photos={post.photos}
            index={lightbox}
            onIndex={setLightbox}
            onClose={() => setLightbox(null)}
            name={a.name}
            t={t}
          />
        )}
      </AnimatePresence>
    </motion.article>
  );
}

// ---------- Liste mit Nachladen ----------

export function usePosts(endpoint) {
  const [posts, setPosts] = useState(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const gen = useRef(0);

  useEffect(() => {
    const g = ++gen.current;
    if (!endpoint) return;
    setPosts(null);
    setDone(false);
    setError(null);
    setLoading(true);
    api(endpoint)
      .then((rows) => {
        if (g !== gen.current) return;
        setPosts(rows);
        setDone(rows.length < 10);
      })
      .catch((err) => g === gen.current && setError(err))
      .finally(() => g === gen.current && setLoading(false));
  }, [endpoint]);

  const more = useCallback(async () => {
    if (loading || done || !posts?.length) return;
    const g = gen.current;
    setLoading(true);
    try {
      const sep = endpoint.includes('?') ? '&' : '?';
      const rows = await api(`${endpoint}${sep}before=${posts[posts.length - 1].id}`);
      if (g !== gen.current) return;
      setPosts((p) => [...p, ...rows.filter((r) => !p.some((x) => x.id === r.id))]);
      setDone(rows.length < 10);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, loading, done, posts]);

  const prepend = useCallback((post) => setPosts((p) => [post, ...(p || [])]), []);
  const remove = useCallback((id) => setPosts((p) => p.filter((x) => x.id !== id)), []);
  return { posts, done, loading, error, more, prepend, remove };
}

export function PostList({ feed, empty }) {
  const { t } = useI18n();
  const sentinel = useRef(null);
  const { posts, done, loading, error, more, remove } = feed;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && more(), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more]);

  if (!posts) {
    return error ? (
      <div className="empty">{errorText(t, error)}</div>
    ) : (
      <div className="post-list">
        {[0, 1].map((k) => (
          <div key={k} className="post-card post-skeleton">
            <div className="skeleton-line" style={{ width: '40%' }} />
            <div className="skeleton-line" style={{ width: '90%' }} />
            <div className="skeleton-line" style={{ width: '70%' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="post-list">
      <AnimatePresence initial={false} mode="popLayout">
        {posts.map((p, i) => (
          <PostCard key={p.id} post={p} i={i} onDeleted={remove} />
        ))}
      </AnimatePresence>
      {!posts.length && <div className="post-card post-empty">{empty}</div>}
      {!done && (
        <div ref={sentinel} className="post-loader">
          {loading && <SpinnerIcon className="spin" />}
        </div>
      )}
    </div>
  );
}
