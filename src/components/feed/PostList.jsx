import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import PostCard from './PostCard.jsx';
import { SpinnerIcon } from '../Icons.jsx';
import { api } from '../../lib/api.js';
import { useI18n, errorText } from '../../lib/i18n.jsx';

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
