import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Photo } from './Media.jsx';
import { HeartIcon, CheckIcon, PinIcon } from './Icons.jsx';
import { toggleFavorite, useFavorites, prefetchEscort, preloadImage } from '../lib/store.js';
import { layoutTransition, ease } from '../lib/motion.js';

export default function EscortCard({ escort, index = 0, instant = false }) {
  const favs = useFavorites();
  const isFav = favs.has(escort.slug);
  const cover = escort.photos[0];

  const warm = () => {
    prefetchEscort(escort.slug).catch(() => {});
    if (cover) preloadImage(cover.url);
  };

  return (
    <motion.div
      initial={instant ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease, delay: Math.min(index, 14) * 0.035 }}
    >
      <Link
        to={`/escort/${escort.slug}`}
        className="card"
        onMouseEnter={warm}
        onTouchStart={warm}
        onFocus={warm}
        aria-label={`${escort.name}, ${escort.age}, ${escort.city}`}
      >
        <motion.div
          layoutId={`media-${escort.slug}`}
          className="card-media"
          style={{ borderRadius: 22 }}
          transition={layoutTransition}
        >
          <div className="card-zoom">
            <Photo src={cover?.thumb} escort={escort} alt={escort.name} />
          </div>
          <div className="card-shade" />
        </motion.div>

        <div className="card-badges">
          {escort.verified ? (
            <span className="badge light">
              <CheckIcon /> Verifiziert
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            className={`fav-btn ${isFav ? 'on' : ''}`}
            aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(escort.slug);
            }}
          >
            <motion.span
              key={String(isFav)}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              style={{ display: 'grid' }}
            >
              <HeartIcon filled={isFav} />
            </motion.span>
          </button>
        </div>

        <div className="card-info">
          <div className="card-name">
            {escort.name} <span className="age">{escort.age}</span>
          </div>
          <div className="card-city">
            <span className={`dot ${escort.available ? '' : 'off'}`} />
            {escort.city || <PinIcon />}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function GridSkeleton({ count = 10 }) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
