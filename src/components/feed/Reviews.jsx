import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../Avatar.jsx';
import { useToast } from '../Toast.jsx';
import { StarIcon, SpinnerIcon } from '../Icons.jsx';
import { api } from '../../lib/api.js';
import { useI18n, errorText } from '../../lib/i18n.jsx';
import { profilePath } from '../../lib/links.js';
import { timeAgo } from '../../lib/time.js';
import { useReport } from '../Report.jsx';

export const formatRating = (n, locale) =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

// Sterne als Anzeige (gerundet auf ganze Sterne)
export function Stars({ value, size = 16, className = '' }) {
  const full = Math.round(value || 0);
  return (
    <span className={`stars ${className}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= full} width={size} height={size} className={n <= full ? 'on' : ''} />
      ))}
    </span>
  );
}

// Sterne zum Anklicken (Tastatur: Pfeiltasten über die Radiogruppe)
function StarPicker({ value, onChange }) {
  const { t } = useI18n();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div
      className="star-picker"
      role="radiogroup"
      aria-label={t('reviews.yourRating')}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t('reviews.stars', { n })}
          className={n <= shown ? 'on' : ''}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <StarIcon filled={n <= shown} width={26} height={26} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ base, delBase, texts, mine, onSaved }) {
  const { t } = useI18n();
  const toast = useToast();
  const [rating, setRating] = useState(mine?.rating || 0);
  const [body, setBody] = useState(mine?.body || '');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!mine);

  async function run(request, message) {
    setBusy(true);
    try {
      const r = await request();
      onSaved(r);
      toast(message);
      return r;
    } catch (err) {
      toast(errorText(t, err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!rating) return toast(t('errors.review_rating'));
    const r = await run(() => api(`${base}/review`, { method: 'PUT', body: { rating, body } }), t('reviews.saved'));
    if (r) setEditing(false);
  }

  async function remove() {
    if (!window.confirm(t('reviews.confirmDelete'))) return;
    // danach wird das Formular über den neuen key frisch aufgebaut
    await run(() => api(`${delBase}/${mine.id}`, { method: 'DELETE' }), t('reviews.deleted'));
  }

  if (mine && !editing) {
    return (
      <div className="review-mine">
        <span>{t('reviews.yours')}</span>
        <Stars value={mine.rating} />
        <button type="button" className="status-pill" onClick={() => setEditing(true)}>
          {t('feed.edit')}
        </button>
      </div>
    );
  }

  return (
    <form className="review-form" onSubmit={save}>
      <div className="review-form-head">
        <span>{mine ? t('reviews.yours') : texts.rateTitle}</span>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <AnimatePresence initial={false}>
        {rating > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <textarea
              className="input review-input"
              value={body}
              maxLength={1000}
              placeholder={texts.placeholder}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="review-form-bar">
              {mine && (
                <button type="button" className="status-pill" onClick={remove} disabled={busy}>
                  {t('feed.delete')}
                </button>
              )}
              {mine && (
                <button type="button" className="status-pill" onClick={() => setEditing(false)} disabled={busy}>
                  {t('feed.cancel')}
                </button>
              )}
              <button type="submit" className="small-btn" disabled={busy}>
                {busy && <SpinnerIcon width={14} height={14} className="spin" />}
                {t('reviews.submit')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function ReviewItem({ r, onDelete, reportKind }) {
  const { t, locale } = useI18n();
  const report = useReport();
  const to = profilePath(r.author);
  return (
    <motion.div
      className="review"
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <Link to={to} className="review-avatar" aria-label={r.author.name}>
        <Avatar name={r.author.name} thumb={r.author.thumb} size={36} />
      </Link>
      <div className="review-main">
        <div className="review-top">
          <Link to={to}>{r.author.name}</Link>
          <Stars value={r.rating} size={13} />
          <small>{timeAgo(r.at, locale, 'short')}</small>
          {r.canDelete && !r.mine && (
            <button type="button" className="review-delete" onClick={() => onDelete(r)}>
              {t('feed.delete')}
            </button>
          )}
          {!r.mine && (
            <button
              type="button"
              className="review-delete"
              onClick={() => report({ kind: reportKind, targetId: r.id, name: r.author.name })}
            >
              {t('report.action')}
            </button>
          )}
        </div>
        <p>{r.body}</p>
      </div>
    </motion.div>
  );
}

// Bewertungen eines Profils: Durchschnitt, Verteilung, eigene Bewertung und Texte.
// target 'escort': Mitglieder bewerten die Escort (ref = slug)
// target 'member': Escorts bewerten das Mitglied (ref = Mitglieds-ID)
export default function Reviews({ target = 'escort', refId, name, onSummary }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const member = target === 'member';
  const base = member ? `/api/members/${encodeURIComponent(refId)}` : `/api/escorts/${encodeURIComponent(refId)}`;
  const delBase = member ? '/api/member-reviews' : '/api/reviews';
  const texts = {
    rateTitle: member ? t('reviews.rateMember', { name }) : t('reviews.rateTitle'),
    placeholder: member ? t('reviews.placeholderMember') : t('reviews.placeholder'),
    from: member ? t('reviews.fromEscorts') : t('reviews.fromMembers'),
  };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const apply = (r) => {
    setData(r);
    onSummary?.({ average: r.average, count: r.count });
  };

  useEffect(() => {
    let alive = true;
    api(`${base}/reviews`)
      .then((r) => alive && setData(r))
      .catch(() => alive && setData({ error: true }));
    return () => {
      alive = false;
    };
  }, [base]);

  async function more() {
    setLoading(true);
    try {
      const r = await api(`${base}/reviews?before=${data.items[data.items.length - 1].id}`);
      setData((d) => ({ ...d, items: [...d.items, ...r.items], done: r.done }));
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setLoading(false);
    }
  }

  async function removeOther(r) {
    if (!window.confirm(t('reviews.confirmDelete'))) return;
    try {
      apply(await api(`${delBase}/${r.id}`, { method: 'DELETE' }));
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  if (!data) return <div className="profile-card skeleton" style={{ height: 150, aspectRatio: 'auto' }} />;
  if (data.error) return null;

  const max = Math.max(1, ...data.distribution);
  return (
    <section className="profile-card reviews" aria-label={t('reviews.title')}>
      <div className="reviews-head">
        <h2 className="profile-card-title">{t('reviews.title')}</h2>
        <span>{texts.from}</span>
      </div>
      <div className="reviews-summary">
        <div className="reviews-score">
          <b>{data.count ? formatRating(data.average, locale) : '–'}</b>
          <Stars value={data.average} />
          <small>{t(data.count === 1 ? 'reviews.countOne' : 'reviews.count', { n: data.count })}</small>
        </div>
        <div className="reviews-bars">
          {data.distribution.map((n, idx) => (
            <div key={idx} className="reviews-bar" title={t('reviews.barLabel', { stars: 5 - idx, n })}>
              <span>{5 - idx}</span>
              <span className="reviews-bar-track">
                <motion.span
                  className="reviews-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${(n / max) * 100}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <small>{n}</small>
            </div>
          ))}
        </div>
      </div>

      {data.canRate && (
        <ReviewForm
          key={data.mine?.id || 'new'}
          base={base}
          delBase={delBase}
          texts={texts}
          mine={data.mine}
          onSaved={apply}
        />
      )}

      {data.items.length > 0 ? (
        <div className="review-list">
          <AnimatePresence initial={false}>
            {data.items.map((r) => (
              <ReviewItem key={r.id} r={r} onDelete={removeOther} reportKind={member ? 'member_review' : 'review'} />
            ))}
          </AnimatePresence>
          {!data.done && (
            <button type="button" className="comments-more" onClick={more} disabled={loading}>
              {t('reviews.more')}
            </button>
          )}
        </div>
      ) : (
        !data.count && (
          <p className="panel-empty">
            {data.canRate ? t('reviews.emptyRate') : member ? t('reviews.emptyMember') : t('reviews.empty')}
          </p>
        )
      )}
    </section>
  );
}

// Bewertungen, die ein Mitglied an Escorts vergeben hat – auf seinem Profil
export function GivenReviews({ memberId, name, self }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const base = `/api/members/${encodeURIComponent(memberId)}/reviews/given`;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    api(base)
      .then((r) => alive && setData(r))
      .catch(() => alive && setData({ error: true }));
    return () => {
      alive = false;
    };
  }, [base]);

  async function more() {
    setLoading(true);
    try {
      const r = await api(`${base}?before=${data.items[data.items.length - 1].id}`);
      setData((d) => ({ ...d, items: [...d.items, ...r.items], done: r.done }));
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setLoading(false);
    }
  }

  if (!data) return <div className="profile-card skeleton" style={{ height: 120, aspectRatio: 'auto' }} />;
  if (data.error) return null;

  return (
    <section className="profile-card reviews" aria-label={t('reviews.givenTitle')}>
      <div className="reviews-head">
        <h2 className="profile-card-title">{t('reviews.givenTitle')}</h2>
        <span>{t('reviews.toEscorts')}</span>
      </div>
      {data.items.length ? (
        <div className="review-list">
          {data.items.map((r) => {
            const to = profilePath(r.escort);
            return (
              <div key={r.id} className="review">
                <Link to={to} className="review-avatar" aria-label={r.escort.name}>
                  <Avatar name={r.escort.name} thumb={r.escort.thumb} size={36} />
                </Link>
                <div className="review-main">
                  <div className="review-top">
                    <Link to={to}>{r.escort.name}</Link>
                    <Stars value={r.rating} size={13} />
                    <small>{timeAgo(r.at, locale, 'short')}</small>
                  </div>
                  {r.body && <p>{r.body}</p>}
                </div>
              </div>
            );
          })}
          {!data.done && (
            <button type="button" className="comments-more" onClick={more} disabled={loading}>
              {t('reviews.more')}
            </button>
          )}
        </div>
      ) : (
        <p className="panel-empty">{self ? t('reviews.givenEmptySelf') : t('reviews.givenEmpty', { name })}</p>
      )}
    </section>
  );
}
