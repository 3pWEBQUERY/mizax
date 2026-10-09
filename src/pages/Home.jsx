import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import Page from '../components/Page.jsx';
import EscortCard, { GridSkeleton } from '../components/EscortCard.jsx';
import Picker from '../components/fields/Picker.jsx';
import { PinIcon, ChevronDown, SpinnerIcon, SearchIcon } from '../components/Icons.jsx';
import PageHead from '../components/PageHead.jsx';
import { useToast } from '../components/Toast.jsx';
import { useEscorts } from '../lib/store.js';
import { useDock, useDockState } from '../lib/dock.jsx';
import { useI18n } from '../lib/i18n.jsx';
import { CANTONS, cantonName, distanceKm, locate } from '../lib/cantons.js';
import { LegalLinks } from './Legal.jsx';

let introPlayed = false;
const RADII = [10, 25, 50, 100];
const pillSpring = { type: 'spring', stiffness: 420, damping: 36 };

const fold = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Suche nach Name, Ort, PLZ, Kanton (Kürzel oder Name in allen Sprachen) und Leistungen;
// mit Standort zusätzlich Umkreis-Filter und Sortierung nach Entfernung.
export function filterEscorts(list, { query = '', canton = '', geo = null, radius = null } = {}) {
  const q = fold(query.trim());
  let out = list.filter((e) => {
    if (canton && e.canton !== canton) return false;
    if (!q) return true;
    const c = CANTONS.find((x) => x.code === e.canton);
    const hay = [e.name, e.city, e.zip, e.canton, c?.de, c?.fr, c?.en, e.tagline, ...(e.services || [])];
    return hay.some((h) => fold(h).includes(q));
  });
  if (geo) {
    out = out
      .map((e) => ({
        ...e,
        distance: e.lat != null && e.lng != null ? distanceKm(geo.lat, geo.lng, e.lat, e.lng) : null,
      }))
      .filter((e) => !radius || (e.distance != null && e.distance <= radius))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }
  return out;
}

function Chip({ active, onClick, children, layoutId, className = '', ...rest }) {
  return (
    <button type="button" className={`chip ${active ? 'active' : ''} ${className}`} onClick={onClick} {...rest}>
      {active && <motion.span layoutId={layoutId} className="chip-bg" transition={pillSpring} />}
      <span>{children}</span>
    </button>
  );
}

export function CantonChips({ escorts }) {
  const { canton, setCanton, geo, setGeo, radius, setRadius } = useDockState();
  const { t, locale } = useI18n();
  const toast = useToast();
  const [locating, setLocating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const anchor = useRef(null);

  const counts = useMemo(() => {
    const m = new Map();
    escorts.forEach((e) => e.canton && m.set(e.canton, (m.get(e.canton) || 0) + 1));
    return m;
  }, [escorts]);

  // Kantone mit Profilen direkt als Chips, alle 26 im durchsuchbaren Auswahlfeld
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c);
  if (canton && !top.includes(canton)) top.push(canton);
  const options = useMemo(
    () =>
      CANTONS.map((c) => ({
        code: c.code,
        name: `${cantonName(c.code, locale)}${counts.get(c.code) ? ` (${counts.get(c.code)})` : ''}`,
        prefix: c.code,
      })).sort((a, b) => a.name.localeCompare(b.name)),
    [counts, locale],
  );

  async function toggleNear() {
    if (geo) {
      setGeo(null);
      setRadius(null);
      return;
    }
    setLocating(true);
    try {
      setGeo(await locate());
    } catch (err) {
      toast(err.code === 'denied' ? t('geo.denied') : t('geo.unavailable'));
    } finally {
      setLocating(false);
    }
  }

  return (
    <LayoutGroup id="canton-chips">
      <div className="chips">
        <Chip active={!canton && !geo} layoutId="canton-pill" onClick={() => { setCanton(''); setGeo(null); setRadius(null); }}>
          {t('home.all')}
          <small>{escorts.length}</small>
        </Chip>
        <Chip active={Boolean(geo)} layoutId="near-pill" onClick={toggleNear} className="near-chip" aria-pressed={Boolean(geo)}>
          {locating ? <SpinnerIcon width={14} height={14} /> : <PinIcon />} {locating ? t('geo.locating') : t('geo.nearMe')}
        </Chip>
        {top.map((c) => (
          <Chip key={c} active={canton === c} layoutId="canton-pill" onClick={() => setCanton(canton === c ? '' : c)}>
            {cantonName(c, locale)}
            <small>{counts.get(c) || 0}</small>
          </Chip>
        ))}
        <div className="select-wrap" style={{ flex: 'none' }}>
          <button
            ref={anchor}
            type="button"
            className={`chip ${pickerOpen ? 'open' : ''}`}
            onClick={() => setPickerOpen((o) => !o)}
            aria-expanded={pickerOpen}
          >
            <span>
              {t('geo.allCantons')} <ChevronDown width={14} height={14} style={{ verticalAlign: '-2px' }} />
            </span>
          </button>
          <Picker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            anchorRef={anchor}
            options={options}
            selected={new Set(canton ? [canton] : [])}
            onPick={(c) => setCanton(c)}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {geo && (
          <motion.div
            className="chips radius-chips"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 22 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="chips-label">{t('geo.radius')}</span>
            {RADII.map((r) => (
              <Chip key={r} active={radius === r} layoutId="radius-pill" onClick={() => setRadius(radius === r ? null : r)}>
                {t('geo.km', { n: r })}
              </Chip>
            ))}
            <Chip active={!radius} layoutId="radius-pill" onClick={() => setRadius(null)}>
              {t('geo.all')}
            </Chip>
          </motion.div>
        )}
      </AnimatePresence>
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
  const { query, canton, geo, radius } = useDockState();
  const { t } = useI18n();
  const [instant] = useState(() => introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);

  const filtered = useMemo(
    () => (escorts ? filterEscorts(escorts, { query, canton, geo, radius }) : []),
    [escorts, query, canton, geo, radius],
  );

  const filteredView = Boolean(query.trim() || canton || geo);
  const n = filtered.length;
  const sub = !escorts
    ? null
    : filteredView
      ? t(n === 1 ? 'home.matchesOne' : 'home.matches', { n })
      : t(n === 1 ? 'home.countOne' : 'home.count', { n });

  return (
    <Page className="home-page">
      <PageHead wide title={t('nav.discover')} text={sub} />
      {escorts && <CantonChips escorts={escorts} />}

      {error && !escorts ? (
        <div className="empty">{t('home.loadError')}</div>
      ) : !escorts ? (
        <GridSkeleton />
      ) : filtered.length ? (
        <EscortGrid list={filtered} instant={instant} />
      ) : (
        <motion.div className="panel conv-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="conv-empty">
            <span className="settings-icon">
              <SearchIcon width={22} height={22} />
            </span>
            <b>{t('home.empty')}</b>
          </div>
        </motion.div>
      )}

      {escorts && <LegalLinks className="page-legal" />}
    </Page>
  );
}
