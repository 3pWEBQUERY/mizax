import { availableNow } from '../lib/schedule.js';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Photo } from './Media.jsx';
import { HeartIcon, CheckIcon, PinIcon, StarIcon } from './Icons.jsx';
import { toggleFavorite, useFavorites, prefetchEscort, preloadImage } from '../lib/store.js';
import { layoutTransition, ease } from '../lib/motion.js';
import { useI18n } from '../lib/i18n.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from './Toast.jsx';

const ratingFormat = (n, locale) =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

export default function EscortCard({ escort, index = 0, instant = false, note }) {
  const favs = useFavorites();
  const { t, locale } = useI18n();
  const rating = escort.rating?.count > 0 ? escort.rating : null;
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
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
        className={`card ${escort.plan?.highlight ? 'highlighted' : ''}`}
        onMouseEnter={warm}
        onTouchStart={warm}
        onFocus={warm}
        aria-label={[
          `${escort.name}, ${escort.age}, ${escort.city}`,
          rating && `${ratingFormat(rating.average, locale)} ★`,
          note,
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        <motion.div
          layoutId={`media-${escort.slug}`}
          className="card-media"
          style={{ borderRadius: 16 }}
          transition={layoutTransition}
        >
          <div className="card-zoom">
            <Photo src={cover?.thumb} escort={escort} alt={escort.name} />
          </div>
        </motion.div>

        <div className="card-badges">
          <span className="card-badges-left">
            {escort.plan?.highlight && <span className="badge plan-badge">{escort.plan.name}</span>}
            {escort.verified && (
              <span className="badge light" title={t('card.verified')}>
                <CheckIcon /> <span className="badge-text">{t('card.verified')}</span>
              </span>
            )}
          </span>
          <button
            type="button"
            className={`fav-btn ${isFav ? 'on' : ''}`}
            aria-label={isFav ? t('card.removeFav') : t('card.addFav')}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!user) {
                toast(t('fav.guest'));
                navigate('/login');
                return;
              }
              toggleFavorite(escort.slug).catch(() => {});
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
            <span className="name">{escort.name}</span>
            <span className="age">{escort.age}</span>
            {rating && (
              <span
                className="card-rating"
                title={t(rating.count === 1 ? 'reviews.countOne' : 'reviews.count', { n: rating.count })}
              >
                <StarIcon filled width={12} height={12} />
                {ratingFormat(rating.average, locale)}
              </span>
            )}
          </div>
          <div className="card-city">
            <span className={`dot ${availableNow(escort) ? '' : 'off'}`} />
            {escort.city ? <span className="city">{escort.city}</span> : <PinIcon />}
            {escort.canton && <span className="card-canton">{escort.canton}</span>}
            {escort.distance != null && (
              <span className="card-distance">
                {escort.distance < 1 ? t('geo.near') : t('geo.away', { n: Math.round(escort.distance) })}
              </span>
            )}
          </div>
          {note && <div className="card-note">{note}</div>}
        </div>
      </Link>
    </motion.div>
  );
}

export function GridSkeleton({ count = 10 }) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card card-skel" aria-hidden="true">
          <div className="skeleton" style={{ borderRadius: 16 }} />
          <div className="card-info">
            <span className="skeleton-line" style={{ width: '55%' }} />
            <span className="skeleton-line" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
