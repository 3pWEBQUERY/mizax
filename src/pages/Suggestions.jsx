import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Page from '../components/Page.jsx';
import PageHead from '../components/PageHead.jsx';
import EscortCard from '../components/EscortCard.jsx';
import { Rise } from '../components/Bubble.jsx';
import { useToast } from '../components/Toast.jsx';
import { PinIcon, ChevronR, ChevronDown } from '../components/Icons.jsx';
import Floating from '../components/fields/Floating.jsx';
import PlaceField from '../components/fields/PlaceField.jsx';
import ServicesPage from '../components/fields/ServicesPage.jsx';
import Chip from '../components/Chip.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { useI18n, errorText } from '../lib/i18n.jsx';
import { refreshUnread } from '../lib/inbox.js';
import { timeAgo } from '../lib/time.js';

const RADII = [10, 25, 50, 100];
const SECTIONS = ['new', 'returning', 'moved', 'matches'];
const spring = { type: 'spring', stiffness: 420, damping: 34 };

// Vorschläge für Mitglieder – aufgebaut wie die Startseite: Präferenzen als Chips
// (Standort, Alter, Vorlieben, Umkreis), darunter die passenden Escorts.
export default function Suggestions() {
  useDock({ mode: 'hidden' });
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const toast = useToast();
  const [saved, setSaved] = useState(null);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const member = user && user.role !== 'escort';

  useEffect(() => {
    if (!member) return;
    api('/api/me/prefs')
      .then(setSaved)
      .catch(() => {});
  }, [member]);

  const enabled = Boolean(saved?.enabled);
  useEffect(() => {
    if (!enabled) {
      setData(null);
      return undefined;
    }
    let alive = true;
    api('/api/me/suggestions')
      .then((d) => {
        if (!alive) return;
        setData(d);
        // als gesehen markieren, damit das Abzeichen im Menü verschwindet
        api('/api/me/suggestions/seen', { method: 'POST' })
          .then(refreshUnread)
          .catch(() => {});
      })
      .catch(() => alive && setData({ error: true }));
    return () => {
      alive = false;
    };
  }, [enabled, saved]);

  // jede Änderung an den Chips wird sofort gespeichert
  async function save(patch) {
    setBusy(true);
    try {
      const p = await api('/api/me/prefs', { method: 'PUT', body: { ...saved, ...patch } });
      setSaved(p);
      return p;
    } catch (err) {
      toast(errorText(t, err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function toggle(on) {
    if (await save({ enabled: on })) toast(on ? t('sug.on') : t('sug.off'));
  }

  if (ready && !user) return <Navigate to="/login" replace state={{ from: '/suggestions' }} />;

  const head = (
    <PageHead wide title={t('sug.title')} text={t('sug.intro')}>
      {saved && (
        <div className="range-switch" role="radiogroup" aria-label={t('sug.enable')}>
          {[
            [false, t('sug.inactive')],
            [true, t('sug.active')],
          ].map(([on, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={enabled === on}
              className={enabled === on ? 'active' : ''}
              disabled={busy}
              onClick={() => enabled !== on && toggle(on)}
            >
              {enabled === on && <motion.span layoutId="sug-enabled" className="chip-bg" transition={spring} />}
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </PageHead>
  );

  if (user && !member) {
    return (
      <Page>
        {head}
        <Rise i={3} className="panel stats-empty">
          <p>{t('sug.membersOnly')}</p>
        </Rise>
      </Page>
    );
  }

  return (
    <Page className="sug-page">
      {head}
      {saved && <PrefChips prefs={saved} onSave={save} />}

      {saved && !enabled && (
        <>
          <div className="stat-tiles sug-explain">
            {SECTIONS.map((k, idx) => (
              <Rise key={k} i={4 + idx} className="stat-tile">
                <span className="stat-label">{t(`sug.section_${k}`)}</span>
                <span className="sug-explain-text">{t(`sug.explain_${k}`)}</span>
              </Rise>
            ))}
          </div>
          <Rise i={8} className="panel stats-empty">
            <p>{t('sug.offText')}</p>
            <button type="button" className="small-btn" onClick={() => toggle(true)} disabled={busy}>
              {t('sug.enableSave')}
              <ChevronR width={14} height={14} />
            </button>
          </Rise>
        </>
      )}

      {enabled && <Results data={data} />}
    </Page>
  );
}

// Aufklappfenster an einem Chip (auf dem Handy als Leiste über dem Dock)
function Popover({ open, onClose, anchorRef, width = 320, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      // Klicks im Fenster selbst oder in dessen Ortsliste (ebenfalls .picker) schliessen nicht
      if (anchorRef.current?.contains(e.target) || e.target.closest?.('.picker')) return;
      onClose();
    };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);
  return (
    <AnimatePresence>
      {open && (
        <Floating anchorRef={anchorRef} width={width} sheet className="sug-pop">
          {children}
        </Floating>
      )}
    </AnimatePresence>
  );
}

function PrefChips({ prefs, onSave }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(null); // 'place' | 'age' | 'likes'
  const placeRef = useRef(null);
  const ageRef = useRef(null);
  const close = () => setOpen(null);
  const toggle = (k) => setOpen((o) => (o === k ? null : k));
  const hasPlace = Boolean(prefs.city);
  const hasAge = Boolean(prefs.ageMin || prefs.ageMax);
  const radius = hasPlace ? prefs.radius : null;

  return (
    <LayoutGroup id="sug-chips">
      <Rise i={2} className="chips">
        <Chip
          ref={placeRef}
          active={hasPlace}
          className={open === 'place' ? 'open' : ''}
          onClick={() => toggle('place')}
          aria-expanded={open === 'place'}
        >
          <PinIcon /> {hasPlace ? prefs.city : t('sug.place')}
          <ChevronDown width={14} height={14} className="chip-chev" />
        </Chip>
        <Chip
          ref={ageRef}
          active={hasAge}
          className={open === 'age' ? 'open' : ''}
          onClick={() => toggle('age')}
          aria-expanded={open === 'age'}
        >
          {hasAge ? t('sug.ageRange', { min: prefs.ageMin || 18, max: prefs.ageMax || 99 }) : t('sug.anyAge')}
          <ChevronDown width={14} height={14} className="chip-chev" />
        </Chip>
        <Chip active={prefs.services.length > 0} onClick={() => setOpen('likes')}>
          {t('sug.likes')}
          {prefs.services.length > 0 && <small>{prefs.services.length}</small>}
        </Chip>
      </Rise>

      <Rise i={3} className="chips radius-chips">
        <span className="chips-label">{t('geo.radius')}</span>
        {RADII.map((r) => (
          <Chip
            key={r}
            active={radius === r}
            layoutId="sug-radius"
            disabled={!hasPlace}
            onClick={() => onSave({ radius: r })}
          >
            {t('sug.km', { n: r })}
          </Chip>
        ))}
        <Chip active={!radius} layoutId="sug-radius" onClick={() => onSave({ radius: null })}>
          {t('sug.allSwitzerland')}
        </Chip>
        {!hasPlace && <span className="sug-hint">{t('sug.radiusHint')}</span>}
      </Rise>

      <Popover open={open === 'place'} onClose={close} anchorRef={placeRef} width={360}>
        <div className="sug-pop-body">
          <div className="sug-pop-title">{t('sug.place')}</div>
          <PlaceField
            city={prefs.city}
            zip={prefs.zip}
            canton={prefs.canton}
            hint={t('sug.placeHint')}
            onChange={(p) => {
              // gespeichert wird erst ein Ort aus der Liste (mit Kanton)
              if (p.canton) onSave(p).then(close);
            }}
          />
          {hasPlace && (
            <button
              type="button"
              className="status-pill sug-pop-clear"
              onClick={() => onSave({ city: '', zip: '', canton: '' }).then(close)}
            >
              {t('sug.clearPlace')}
            </button>
          )}
        </div>
      </Popover>

      <Popover open={open === 'age'} onClose={close} anchorRef={ageRef} width={300}>
        <AgeForm prefs={prefs} onSave={(p) => onSave(p).then(close)} />
      </Popover>

      <ServicesPage
        open={open === 'likes'}
        value={prefs.services}
        title={t('sug.likes')}
        text={t('sug.likesText')}
        onSave={async (services) => {
          await onSave({ services });
          close();
        }}
        onBack={close}
      />
    </LayoutGroup>
  );
}

function AgeForm({ prefs, onSave }) {
  const { t } = useI18n();
  const [min, setMin] = useState(prefs.ageMin ?? '');
  const [max, setMax] = useState(prefs.ageMax ?? '');
  return (
    <form
      className="sug-pop-body"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ageMin: min, ageMax: max });
      }}
    >
      <div className="sug-pop-title">{t('sug.age')}</div>
      <div className="sug-age">
        <label className="field">
          <span>{t('sug.ageFrom')}</span>
          <input
            className="input"
            type="number"
            min={18}
            max={99}
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{t('sug.ageTo')}</span>
          <input
            className="input"
            type="number"
            min={18}
            max={99}
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
        </label>
      </div>
      <div className="sug-pop-bar">
        <button type="button" className="status-pill" onClick={() => onSave({ ageMin: null, ageMax: null })}>
          {t('sug.anyAge')}
        </button>
        <button type="submit" className="small-btn">
          {t('sug.apply')}
        </button>
      </div>
    </form>
  );
}

function noteFor(e, t, locale) {
  const s = e.suggestion;
  const when = s.at ? timeAgo(s.at, locale, 'short') : '';
  const event = s.event === 'moved' ? t('sug.noteMoved', { city: e.city, time: when }) : when;
  const shared = s.total ? t('sug.shared', { n: s.shared, total: s.total }) : '';
  return [s.fresh ? `● ${event}` : event, shared].filter(Boolean).join(' · ');
}

function Results({ data }) {
  const { t, locale } = useI18n();
  if (!data) {
    return (
      <div className="grid">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
    );
  }
  if (data.error) return <div className="empty">{t('errors.server_error')}</div>;
  const empty = SECTIONS.every((k) => !data.sections[k].length);
  if (empty) {
    return (
      <Rise i={4} className="panel stats-empty">
        <p>{t('sug.empty')}</p>
        <Link to="/" className="small-btn">
          {t('fav.discover')}
          <ChevronR width={14} height={14} />
        </Link>
      </Rise>
    );
  }
  let i = 0;
  return SECTIONS.filter((k) => data.sections[k].length).map((k) => (
    <section key={k} className="sug-section">
      <Rise i={4} className="panel-title sug-section-head">
        <h2>{t(`sug.section_${k}`)}</h2>
        <span>{t(`sug.sectionText_${k}`)}</span>
      </Rise>
      <div className="grid">
        {data.sections[k].map((e) => (
          <EscortCard key={e.slug} escort={e} index={i++} note={noteFor(e, t, locale)} />
        ))}
      </div>
    </section>
  ));
}
