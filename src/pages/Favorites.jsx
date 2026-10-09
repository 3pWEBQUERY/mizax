import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';
import PageHead from '../components/PageHead.jsx';
import { GridSkeleton } from '../components/EscortCard.jsx';
import { HeartIcon, ChevronR } from '../components/Icons.jsx';
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
        <Head title={title} text={t('fav.guest')}>
          <Link to="/register" className="status-pill">
            {t('menu.register')}
          </Link>
          <Link to="/login" className="small-btn">
            {t('menu.login')}
            <ChevronR width={14} height={14} />
          </Link>
        </Head>
      </Page>
    );
  }

  const empty = escorts && mine.length === 0;

  return (
    <Page>
      <Head title={title} text={empty ? t('fav.empty') : escorts ? t('fav.count', { n: mine.length }) : null}>
        {empty ? (
          <Link to="/" className="small-btn">
            {t('fav.discover')}
            <ChevronR width={14} height={14} />
          </Link>
        ) : (
          escorts && (
            <span className="status-pill fav-pill">
              <HeartIcon filled width={14} height={14} />
              {mine.length}
            </span>
          )
        )}
      </Head>
      {!escorts ? <GridSkeleton count={5} /> : list.length ? <EscortGrid list={list} instant /> : null}
      {escorts && mine.length > 0 && !list.length && <div className="empty">{t('fav.noMatch')}</div>}
    </Page>
  );
}
