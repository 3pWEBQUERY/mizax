import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { GridSkeleton } from '../components/EscortCard.jsx';
import { useEscorts, useFavorites } from '../lib/store.js';
import { useDock, useDockState } from '../lib/dock.jsx';
import { EscortGrid, filterEscorts } from './Home.jsx';

export default function Favorites() {
  useDock({ mode: 'search' });
  const { escorts } = useEscorts();
  const favs = useFavorites();
  const { query, city } = useDockState();
  const list = useMemo(
    () => (escorts ? filterEscorts(escorts.filter((e) => favs.has(e.slug)), query, city) : []),
    [escorts, favs, query, city],
  );
  const total = escorts ? escorts.filter((e) => favs.has(e.slug)).length : 0;

  return (
    <Page>
      <div className="bubbles">
        <Bubble i={0}>Deine Favoriten.</Bubble>
        {escorts && total === 0 ? (
          <>
            <Bubble i={1}>
              Du hast noch keine Favoriten gespeichert. Tippe auf das Herz einer Karte, um ein Profil hier zu
              sammeln.
            </Bubble>
            <Rise i={2}>
              <Link to="/" className="white-btn">
                Profile entdecken
              </Link>
            </Rise>
          </>
        ) : (
          <Bubble i={1}>
            {total === 1 ? 'Ein gespeichertes Profil' : `${total} gespeicherte Profile`} – nur auf diesem Gerät
            sichtbar.
          </Bubble>
        )}
      </div>
      {!escorts ? <GridSkeleton count={5} /> : list.length ? <EscortGrid list={list} instant /> : null}
      {escorts && total > 0 && !list.length && <div className="empty">Keine Treffer für deine Suche.</div>}
    </Page>
  );
}
