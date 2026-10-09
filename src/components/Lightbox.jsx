import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect } from 'react';
import { CloseIcon, ChevronL, ChevronR } from './Icons.jsx';

export default function Lightbox({ photos, index, onIndex, onClose, name, t }) {
  const go = useCallback(
    (d) => onIndex((index + d + photos.length) % photos.length),
    [index, onIndex, photos.length],
  );
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);
  const p = photos[index];

  return (
    <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="lightbox-bg" onClick={onClose} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={p.id}
          className="lightbox-img"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <img src={p.url} alt={name} />
        </motion.div>
      </AnimatePresence>
      <button type="button" className="icon-btn" style={{ position: 'absolute', top: 18, right: 20 }} onClick={onClose} aria-label={t('profile.close')}>
        <CloseIcon />
      </button>
      {photos.length > 1 && (
        <>
          <button type="button" className="icon-btn lightbox-nav" style={{ left: 20 }} onClick={() => go(-1)} aria-label={t('profile.prev')}>
            <ChevronL />
          </button>
          <button type="button" className="icon-btn lightbox-nav" style={{ right: 20 }} onClick={() => go(1)} aria-label={t('profile.next')}>
            <ChevronR />
          </button>
        </>
      )}
    </motion.div>
  );
}
