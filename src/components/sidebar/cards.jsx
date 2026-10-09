import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../Avatar.jsx';
import BarChart from '../BarChart.jsx';
import Delta from '../Delta.jsx';
import { useToast } from '../Toast.jsx';
import { ChartIcon, ChevronR, ImageIcon, SpinnerIcon } from '../Icons.jsx';
import { api } from '../../lib/api.js';
import { useI18n, errorText } from '../../lib/i18n.jsx';
import { useOwnEscort } from '../../lib/ownEscort.js';
import { formatNumber, timeAgo } from '../../lib/time.js';

// Karten der Seitenleiste
export const cardVariants = {
  hidden: { opacity: 0, x: -24, scale: 0.97, filter: 'blur(6px)' },
  show: (i) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 320, damping: 32, delay: 0.05 + i * 0.06 },
  }),
  exit: { opacity: 0, x: -16, transition: { duration: 0.18 } },
};

export function Card({ i, title, badge, to, toLabel, children, className = '' }) {
  return (
    <motion.section
      className={`side-card ${className}`}
      variants={cardVariants}
      custom={i}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {title && (
        <header className="side-card-head">
          <h3>{title}</h3>
          {badge > 0 && <span className="count-badge">{badge}</span>}
          {to && (
            <Link to={to} className="side-card-link" aria-label={toLabel || title}>
              <ChevronR width={16} height={16} />
            </Link>
          )}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export function MiniStat({ label, value }) {
  const { locale } = useI18n();
  return (
    <div className="mini-stat">
      <b>{formatNumber(value, locale)}</b>
      <span>{label}</span>
    </div>
  );
}

export function StatsCard({ i, stats }) {
  const { t, locale } = useI18n();
  const T = stats?.totals;
  const escort = stats?.role === 'escort';
  if (escort && !stats.profile) {
    return (
      <Card i={i} title={t('stats.title')}>
        <p className="side-text">{t('stats.noProfile')}</p>
        <Link to="/me" className="small-btn side-small">
          {t('menu.myProfile')}
          <ChevronR width={14} height={14} />
        </Link>
      </Card>
    );
  }
  const main = escort ? T?.views : T?.visits;
  const prev = escort ? T?.prevViews : T?.prevVisits;
  return (
    <Card i={i} title={t('stats.title')} to="/stats">
      {T ? (
        <>
          <div className="side-kpi">
            <b>{formatNumber(main, locale)}</b>
            <span>
              {escort ? t('sidebar.views14') : t('sidebar.visits14')}
              <Delta now={main} prev={prev} />
            </span>
          </div>
          {stats.series.some((d) => d.value > 0) ? (
            <BarChart
              data={stats.series}
              label={escort ? t('stats.viewsUnit') : t('stats.visitsUnit')}
              height={64}
              compact
            />
          ) : (
            <div className="side-empty-chart">
              <ChartIcon width={18} height={18} />
              {escort ? t('sidebar.noViews') : t('sidebar.noVisits')}
            </div>
          )}
          <div className="mini-stats">
            {escort ? (
              <>
                <MiniStat label={t('stats.visitors')} value={T.visitors} />
                <MiniStat label={t('stats.favorites')} value={T.favorites} />
                <MiniStat label={t('stats.messages')} value={T.messages} />
              </>
            ) : (
              <>
                <MiniStat label={t('stats.favorites')} value={T.favorites} />
                <MiniStat label={t('stats.viewed')} value={T.viewed} />
                <MiniStat label={t('stats.conversationsTile')} value={T.conversations} />
              </>
            )}
          </div>
        </>
      ) : (
        <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
      )}
    </Card>
  );
}

export function QuickPost({ onPosted }) {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const own = useOwnEscort();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [body]);

  if (!own) {
    return (
      <>
        <p className="side-text">{t('feed.needProfile')}</p>
        <Link to="/me" className="small-btn side-small">
          {t('menu.myProfile')}
          <ChevronR width={14} height={14} />
        </Link>
      </>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    const form = new FormData();
    form.append('body', body.trim());
    try {
      const post = await api('/api/me/posts', { method: 'POST', form });
      setBody('');
      toast(t('feed.posted'));
      onPosted(post);
    } catch (err) {
      toast(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="quick-post" onSubmit={submit}>
      <textarea
        ref={ref}
        rows={2}
        value={body}
        maxLength={5000}
        placeholder={t('feed.placeholder', { name: own.name })}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="quick-post-bar">
        <button
          type="button"
          className="quick-post-tool"
          onClick={() => navigate('/feed?compose=1')}
          aria-label={t('feed.addPhotos')}
        >
          <ImageIcon width={18} height={18} />
        </button>
        <button type="submit" className="small-btn" disabled={!body.trim() || busy}>
          {busy && <SpinnerIcon width={14} height={14} className="spin" />}
          {t('feed.post')}
        </button>
      </div>
    </form>
  );
}

export function MiniPost({ p }) {
  const { locale } = useI18n();
  return (
    <Link to="/feed" className="mini-post">
      <Avatar name={p.author.name} thumb={p.author.thumb} size={34} />
      <span className="mini-post-main">
        <span className="mini-post-top">
          <b>{p.author.name}</b>
          <small>{timeAgo(p.createdAt, locale, 'short')}</small>
        </span>
        {p.body && <span className="mini-post-text">{p.body}</span>}
      </span>
      {p.photos[0] && <img className="mini-post-img" src={p.photos[0].thumb} alt="" loading="lazy" />}
    </Link>
  );
}
