import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';
import PageHead from '../components/PageHead.jsx';
import { GridSkeleton } from '../components/EscortCard.jsx';
import { HeartIcon, ChevronR } from '../components/Icons.jsx';
import { Rise } from '../components/Bubble.jsx';
import { useEscorts, useFavorites } from '../lib/store.js';
import { useDock, useDockState } from '../lib/dock.jsx';
import { useT } from '../lib/i18n.jsx';
import { useAuth } from '../lib/auth.jsx';
import { EscortGrid, filterEscorts } from './Home.jsx';

const Head = (props) => <PageHead wide {...props} />;

export default function Favorites() {
  useDock({ mode: 'search' });
  const { escorts } = useEscorts();
  const favs = useFavorites();
  const { user, ready } = useAuth();
  const { query, canton, geo, radius } = useDockState();
  const t = useT();
  const mine = useMemo(() => (escorts ? escorts.filter((e) => favs.has(e.slug)) : []), [escorts, favs]);
  const list = useMemo(
    () => filterEscorts(mine, { query, canton, geo, radius }),
    [mine, query, canton, geo, radius],
  );
  const title = t('fav.title').replace(/\.$/, '');

  if (ready && !user) {
    return (
      <Page>
        <PageHead title={title} />
        <Rise i={2} className="panel conv-panel">
          <div className="conv-empty">
            <span className="settings-icon">
              <HeartIcon width={22} height={22} />
            </span>
            <b>{t('fav.guestTitle')}</b>
            <p>{t('fav.guest')}</p>
            <div className="fav-empty-actions">
              <Link to="/register" className="status-pill">
                {t('menu.register')}
              </Link>
              <Link to="/login" className="small-btn">
                {t('menu.login')}
                <ChevronR width={14} height={14} />
              </Link>
            </div>
          </div>
        </Rise>
      </Page>
    );
  }

  const empty = escorts && mine.length === 0;

  if (empty) {
    return (
      <Page>
        <PageHead title={title} />
        <Rise i={2} className="panel conv-panel">
          <div className="conv-empty">
            <span className="settings-icon">
              <HeartIcon width={22} height={22} />
            </span>
            <b>{t('fav.emptyTitle')}</b>
            <p>{t('fav.empty')}</p>
            <Link to="/" className="small-btn">
              {t('fav.discover')}
              <ChevronR width={14} height={14} />
            </Link>
          </div>
        </Rise>
      </Page>
    );
  }

  return (
    <Page>
      <Head title={title} text={escorts ? t('fav.count', { n: mine.length }) : null} />
      {!escorts ? <GridSkeleton count={5} /> : list.length ? <EscortGrid list={list} instant /> : null}
      {escorts && mine.length > 0 && !list.length && <div className="empty">{t('fav.noMatch')}</div>}
    </Page>
  );
}
