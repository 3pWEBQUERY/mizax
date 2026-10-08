import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { GridSkeleton } from '../components/EscortCard.jsx';
import { useEscorts, useFavorites } from '../lib/store.js';
import { useDock, useDockState } from '../lib/dock.jsx';
import { useT } from '../lib/i18n.jsx';
import { useAuth } from '../lib/auth.jsx';
import { EscortGrid, filterEscorts } from './Home.jsx';

export default function Favorites() {
  useDock({ mode: 'search' });
  const { escorts } = useEscorts();
  const favs = useFavorites();
  const { user, ready } = useAuth();
  const { query, city } = useDockState();
  const t = useT();
  const mine = useMemo(() => (escorts ? escorts.filter((e) => favs.has(e.slug)) : []), [escorts, favs]);
  const list = useMemo(() => filterEscorts(mine, query, city), [mine, query, city]);

  if (ready && !user) {
    return (
      <Page>
        <div className="bubbles">
          <Bubble i={0}>{t('fav.title')}</Bubble>
          <Bubble i={1}>{t('fav.guest')}</Bubble>
          <Rise i={2} className="actions">
            <Link to="/login" className="white-btn">
              {t('menu.login')}
            </Link>
            <Link to="/register" className="ghost-btn">
              {t('menu.register')}
            </Link>
          </Rise>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="bubbles">
        <Bubble i={0}>{t('fav.title')}</Bubble>
        {escorts && mine.length === 0 ? (
          <>
            <Bubble i={1}>{t('fav.empty')}</Bubble>
            <Rise i={2}>
              <Link to="/" className="white-btn">
                {t('fav.discover')}
              </Link>
            </Rise>
          </>
        ) : (
          escorts && <Bubble i={1}>{t('fav.count', { n: mine.length })}</Bubble>
        )}
      </div>
      {!escorts ? <GridSkeleton count={5} /> : list.length ? <EscortGrid list={list} instant /> : null}
      {escorts && mine.length > 0 && !list.length && <div className="empty">{t('fav.noMatch')}</div>}
    </Page>
  );
}
