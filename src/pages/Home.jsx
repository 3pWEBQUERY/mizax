import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import EscortCard, { GridSkeleton } from '../components/EscortCard.jsx';
import { useEscorts } from '../lib/store.js';
import { useDock, useDockState } from '../lib/dock.jsx';
import { formatParts, useNow } from '../components/Clock.jsx';

let introPlayed = false;

export function filterEscorts(list, query, city) {
  const q = query.trim().toLowerCase();
  return list.filter(
    (e) =>
      (!city || e.city === city) &&
      (!q ||
        e.name.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.tagline.toLowerCase().includes(q) ||
        e.services.some((s) => s.toLowerCase().includes(q))),
  );
}

export function CityChips({ escorts }) {
  const { city, setCity } = useDockState();
  const cities = useMemo(() => {
    const m = new Map();
    escorts.forEach((e) => e.city && m.set(e.city, (m.get(e.city) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [escorts]);
  if (cities.length < 2) return null;
  const items = [['', escorts.length], ...cities];
  return (
    <LayoutGroup id="city-chips">
      <div className="chips">
        {items.map(([c, n]) => (
          <button key={c || 'all'} type="button" className={`chip ${city === c ? 'active' : ''}`} onClick={() => setCity(c)}>
            {city === c && (
              <motion.span layoutId="city-pill" className="chip-bg" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
            )}
            <span>
              {c || 'Alle'}
              <small>{n}</small>
            </span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}

export function EscortGrid({ list, instant }) {
  return (
    <motion.div className="grid" layout="position">
      <AnimatePresence initial={false} mode="popLayout">
        {list.map((e, i) => (
          <motion.div
            key={e.slug}
            layout="position"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <EscortCard escort={e} index={i} instant={instant} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Home() {
  useDock({ mode: 'search' });
  const { escorts, error } = useEscorts();
  const { query, city } = useDockState();
  const now = useNow();
  const [instant] = useState(() => introPlayed);
  const [stamp] = useState(() => formatParts(new Date()).time);
  useEffect(() => {
    introPlayed = true;
  }, []);

  const filtered = useMemo(() => (escorts ? filterEscorts(escorts, query, city) : []), [escorts, query, city]);
  const p = formatParts(now);

  return (
    <Page>
      <div className="bubbles">
        <Rise i={0} className="clock-inline bubble-label" instant={instant}>
          {p.day}, {p.date} · {p.time}
        </Rise>
        <Bubble i={0} instant={instant}>Hey, ich bin Mizax.</Bubble>
        <Bubble i={1} instant={instant}>
          Ich zeige dir ausgewählte Begleitungen in deiner Stadt – diskret, stilvoll und persönlich.
        </Bubble>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
          <Rise i={2} className="bubble-time" instant={instant}>
            {stamp}
          </Rise>
          <Bubble i={2} instant={instant}>
            Wähle ein Profil, um mehr zu erfahren, oder suche unten nach Name und Stadt.
          </Bubble>
        </div>
      </div>

      {escorts && <CityChips escorts={escorts} />}

      {error && !escorts ? (
        <div className="empty">Profile konnten nicht geladen werden. {error.message}</div>
      ) : !escorts ? (
        <GridSkeleton />
      ) : filtered.length ? (
        <EscortGrid list={filtered} instant={instant} />
      ) : (
        <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          Keine Profile gefunden{query ? ` für „${query}“` : ''}
          {city ? ` in ${city}` : ''}.
        </motion.div>
      )}
    </Page>
  );
}
