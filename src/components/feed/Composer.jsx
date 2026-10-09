import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../Avatar.jsx';
import { useToast } from '../Toast.jsx';
import { ImageIcon, CloseIcon, SpinnerIcon } from '../Icons.jsx';
import useAutosize from './useAutosize.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useI18n, errorText } from '../../lib/i18n.jsx';
import { useOwnEscort } from '../../lib/ownEscort.js';

const MAX_PHOTOS = 6;

// ---------- Beitrag verfassen ----------

export default function Composer({ onPosted, autoFocus = false }) {
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
