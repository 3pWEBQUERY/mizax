import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../Avatar.jsx';
import Lightbox from '../Lightbox.jsx';
import { useToast } from '../Toast.jsx';
import { HeartIcon, CommentIcon, MoreIcon, CheckIcon, TrashIcon, EditIcon } from '../Icons.jsx';
import Comments from './Comments.jsx';
import useAutosize from './useAutosize.js';
import { api } from '../../lib/api.js';
import { useI18n, errorText } from '../../lib/i18n.jsx';
import { timeAgo } from '../../lib/time.js';

const spring = { type: 'spring', stiffness: 380, damping: 30 };

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

// ---------- Beitrag ----------

export default function PostCard({ post: initial, onDeleted, i = 0 }) {
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
            <button
              type="button"
              className="post-menu-btn"
              aria-label={t('feed.options')}
              onClick={() => setMenu(!menu)}
            >
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
          <textarea
            ref={editRef}
            className="composer-input"
            value={draft}
            maxLength={5000}
            onChange={(e) => setDraft(e.target.value)}
          />
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
          <motion.span
            key={pop}
            initial={pop ? { scale: 0.6 } : false}
            animate={{ scale: [0.6, 1.3, 1] }}
            transition={{ duration: 0.45 }}
            style={{ display: 'grid' }}
          >
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
