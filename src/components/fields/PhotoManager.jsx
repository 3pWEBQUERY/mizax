import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useToast } from '../Toast.jsx';
import { ChevronL, ChevronR, TrashIcon, SpinnerIcon } from '../Icons.jsx';
import { api } from '../../lib/api.js';
import { useT, errorText } from '../../lib/i18n.jsx';

export const MAX_PHOTOS = 20;
const BATCH = 4; // Fotos pro Upload-Anfrage

// Fotos hochladen (auch per Drag & Drop), sortieren und löschen
export default function PhotoManager({ escort, storage, ep, onChange }) {
  const t = useT();
  const toast = useToast();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null); // { done, total } während des Uploads
  const [over, setOver] = useState(false);
  const busy = Boolean(progress);
  const free = MAX_PHOTOS - escort.photos.length;

  async function upload(files) {
    let imgs = [...files].filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    if (imgs.length > free) {
      toast(t('errors.too_many_photos'));
      imgs = imgs.slice(0, Math.max(free, 0));
      if (!imgs.length) return;
    }
    let done = 0;
    setProgress({ done, total: imgs.length });
    try {
      let saved = null;
      for (let i = 0; i < imgs.length; i += BATCH) {
        const form = new FormData();
        imgs.slice(i, i + BATCH).forEach((f) => form.append('photos', f));
        saved = await api(ep.photos(escort), { method: 'POST', form });
        done = Math.min(i + BATCH, imgs.length);
        setProgress({ done, total: imgs.length });
        await onChange?.(saved);
      }
      toast(t('editor.uploaded', { n: imgs.length }));
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setProgress(null);
    }
  }

  async function move(idx, dir) {
    const ids = escort.photos.map((p) => p.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    try {
      const saved = await api(ep.order(escort), { method: 'PUT', body: { ids } });
      await onChange?.(saved);
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  async function del(id) {
    try {
      const saved = await api(ep.deletePhoto(id), { method: 'DELETE' });
      await onChange?.(saved);
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  return (
    <div className="photo-grid">
      {escort.photos.map((p, idx) => (
        <motion.div layout key={p.id} className="photo-item">
          <img src={p.thumb} alt="" />
          {idx === 0 && (
            <span className="badge light" style={{ position: 'absolute', top: 6, left: 6, fontSize: 11 }}>
              {t('editor.cover')}
            </span>
          )}
          <div className="photo-actions">
            <button type="button" className="mini-btn" onClick={() => move(idx, -1)} aria-label={t('editor.moveLeft')}>
              <ChevronL width={16} height={16} />
            </button>
            <button
              type="button"
              className="mini-btn danger"
              onClick={() => del(p.id)}
              aria-label={t('editor.deletePhoto')}
            >
              <TrashIcon />
            </button>
            <button type="button" className="mini-btn" onClick={() => move(idx, 1)} aria-label={t('editor.moveRight')}>
              <ChevronR width={16} height={16} />
            </button>
          </div>
        </motion.div>
      ))}
      {free > 0 && (
        <button
          type="button"
          className={`dropzone ${over ? 'over' : ''}`}
          disabled={busy || !storage}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            upload(e.dataTransfer.files);
          }}
        >
          {busy ? (
            <span style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
              <SpinnerIcon />
              {t('editor.uploading', { done: progress.done, total: progress.total })}
            </span>
          ) : storage ? (
            t('editor.drop')
          ) : (
            t('editor.noBucket')
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
