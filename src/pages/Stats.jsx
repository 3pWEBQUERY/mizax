import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Page from '../components/Page.jsx';
import PageHead from '../components/PageHead.jsx';
import Avatar from '../components/Avatar.jsx';
import BarChart from '../components/BarChart.jsx';
import Delta from '../components/Delta.jsx';
import { Rise } from '../components/Bubble.jsx';
import { ChevronR, UserIcon, EyeIcon } from '../components/Icons.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { useI18n } from '../lib/i18n.jsx';
import { formatNumber, timeAgo } from '../lib/time.js';

const spring = { type: 'spring', stiffness: 420, damping: 34 };
const RANGES = [7, 30, 90];

function Tile({ label, value, sub, delta, i }) {
  const { locale } = useI18n();
  return (
    <motion.div
      className="stat-tile"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.04 }}
    >
      <span className="stat-label">{label}</span>
      <b className="stat-value">{formatNumber(value, locale)}</b>
      <span className="stat-sub">
        {delta}
        {sub && <span>{sub}</span>}
      </span>
    </motion.div>
  );
}

function VisitorRow({ v }) {
  const { t, locale } = useI18n();
  const name = v.kind === 'guest' ? t('stats.guest') : v.kind === 'hidden' ? t('stats.anonymous') : v.name;
  const kind = {
    guest: t('stats.kindGuest'),
    hidden: t('stats.kindHidden'),
    member: t('menu.member'),
    escort: t('menu.escort'),
  }[v.kind];
  const to = v.kind === 'escort' ? `/escort/${v.slug}` : v.kind === 'member' ? `/member/${v.memberId}` : null;
  const inner = (
    <>
      {v.kind === 'guest' || v.kind === 'hidden' ? (
        <span className="person muted" style={{ width: 40, height: 40 }}>
          {v.kind === 'guest' ? <EyeIcon width={18} height={18} /> : <UserIcon width={18} height={18} />}
        </span>
      ) : (
        <Avatar name={v.name} thumb={v.thumb} size={40} />
      )}
      <span className="visitor-main">
        <b>{name}</b>
        <small>
          {kind}
          {v.visits > 1 ? ` · ${t('stats.visitsCount', { n: v.visits })}` : ''}
        </small>
      </span>
      <small className="visitor-time">{timeAgo(v.at, locale, 'short')}</small>
      {to && <ChevronR width={14} height={14} className="visitor-chev" />}
    </>
  );
  return to ? (
    <Link to={to} className="visitor-row link">
      {inner}
    </Link>
  ) : (
    <div className="visitor-row">{inner}</div>
  );
}

export default function Stats() {
  useDock({ mode: 'hidden' });
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    setError(false);
    api(`/api/me/stats?days=${days}`)
      .then(setData)
      .catch(() => setError(true));
  }, [user, days]);

  if (ready && !user) return <Navigate to="/login" replace state={{ from: '/stats' }} />;

  const escort = user?.role === 'escort';
  const T = data?.totals;
  const ranges = (
    <div className="range-switch" role="radiogroup" aria-label={t('stats.range')}>
      {RANGES.map((d) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={days === d}
          className={days === d ? 'active' : ''}
          onClick={() => setDays(d)}
        >
          {days === d && <motion.span layoutId="stats-range" className="chip-bg" transition={spring} />}
          <span>{t('stats.days', { n: d })}</span>
        </button>
      ))}
    </div>
  );

  const head = (
    <PageHead wide title={t('stats.title')} text={escort ? t('stats.introEscort') : t('stats.introMember')}>
      {(!escort || data?.profile) && ranges}
    </PageHead>
  );

  if (escort && data && !data.profile) {
    return (
      <Page>
        <div className="stats">
          {head}
          <Rise i={3} className="panel stats-empty">
            <p>{t('stats.noProfile')}</p>
            <Link to="/me" className="small-btn">
              {t('menu.myProfile')}
              <ChevronR width={14} height={14} />
            </Link>
          </Rise>
        </div>
      </Page>
    );
  }

  const tiles = !T
    ? []
    : escort
      ? [
          { label: t('stats.views'), value: T.views, delta: <Delta now={T.views} prev={T.prevViews} /> },
          {
            label: t('stats.visitors'),
            value: T.visitors,
            sub: t('stats.split', { m: T.memberVisitors, g: T.guestVisitors }),
          },
          { label: t('stats.today'), value: T.today },
          {
            label: t('stats.favorites'),
            value: T.favorites,
            sub: T.newFavorites ? t('stats.newInRange', { n: T.newFavorites }) : null,
          },
          {
            label: t('stats.messages'),
            value: T.messages,
            sub: t(T.conversations === 1 ? 'stats.conversationsOne' : 'stats.conversations', { n: T.conversations }),
          },
          { label: t('stats.posts'), value: T.posts },
          { label: t('stats.likes'), value: T.likes },
          { label: t('stats.comments'), value: T.comments },
        ]
      : [
          { label: t('stats.visits'), value: T.visits, delta: <Delta now={T.visits} prev={T.prevVisits} /> },
          { label: t('stats.visitors'), value: T.visitors },
          { label: t('stats.favorites'), value: T.favorites },
          { label: t('stats.viewed'), value: T.viewed },
          { label: t('stats.conversationsTile'), value: T.conversations },
          { label: t('stats.sent'), value: T.messages },
          { label: t('stats.likesGiven'), value: T.likes },
          { label: t('stats.commentsGiven'), value: T.comments },
        ];

  return (
    <Page>
      <div className="stats">
        {head}
        {error && <div className="empty">{t('errors.server_error')}</div>}

        <div className="stat-tiles">
          {T
            ? tiles.map((tile, i) => <Tile key={tile.label} {...tile} i={i} />)
            : Array.from({ length: 8 }, (_, i) => <div key={i} className="stat-tile skeleton" />)}
        </div>

        <Rise i={3} className="panel stats-panel">
          <div className="panel-title">
            <h2>{escort ? t('stats.chartViews') : t('stats.chartVisits')}</h2>
            <span>{t('stats.lastDays', { n: days })}</span>
          </div>
          {data ? (
            <BarChart
              key={days}
              data={data.series}
              label={escort ? t('stats.viewsUnit') : t('stats.visitsUnit')}
              height={240}
            />
          ) : (
            <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
          )}
        </Rise>

        <div className="stats-cols">
          <Rise i={4} className="panel stats-panel">
            <div className="panel-title">
              <h2>{escort ? t('stats.recentVisitors') : t('stats.whoVisited')}</h2>
            </div>
            {data?.visitors?.length ? (
              <div className="visitor-list">
                {data.visitors.map((v, i) => (
                  <VisitorRow key={`${v.kind}-${v.memberId || v.slug || i}-${v.at}`} v={v} />
                ))}
              </div>
            ) : (
              data && <p className="panel-empty">{escort ? t('stats.noVisitors') : t('stats.noVisitorsMember')}</p>
            )}
            <p className="panel-note">
              {escort ? t('stats.privacyNote') : t('stats.memberHint')}{' '}
              <Link to="/settings/privacy" className="inline-link">
                {t('settings.privacy')}
              </Link>
            </p>
          </Rise>

          {!escort && (
            <Rise i={5} className="panel stats-panel">
              <div className="panel-title">
                <h2>{t('stats.recentlyViewed')}</h2>
              </div>
              {data?.viewed?.length ? (
                <div className="viewed-grid">
                  {data.viewed.map((e) => (
                    <Link key={e.slug} to={`/escort/${e.slug}`} className="viewed-card">
                      <span className="viewed-img">{e.thumb && <img src={e.thumb} alt="" loading="lazy" />}</span>
                      <b>
                        {e.name}, {e.age}
                      </b>
                      <small>{e.city}</small>
                    </Link>
                  ))}
                </div>
              ) : (
                data && <p className="panel-empty">{t('stats.noViewed')}</p>
              )}
            </Rise>
          )}

          {escort && data?.profile && (
            <Rise i={5} className="panel stats-panel stats-tips">
              <div className="panel-title">
                <h2>{t('stats.tipsTitle')}</h2>
              </div>
              <ul>
                <li>{t('stats.tip1')}</li>
                <li>{t('stats.tip2')}</li>
                <li>{t('stats.tip3')}</li>
              </ul>
              <div className="stats-tip-actions">
                <Link to="/feed?compose=1" className="small-btn">
                  {t('feed.newPost')}
                  <ChevronR width={14} height={14} />
                </Link>
                <Link to="/me" className="status-pill">
                  {t('menu.myProfile')}
                </Link>
              </div>
            </Rise>
          )}
        </div>
      </div>
    </Page>
  );
}
