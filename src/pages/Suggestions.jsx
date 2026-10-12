import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Page from '../components/Page.jsx';
import PageHead from '../components/PageHead.jsx';
import EscortCard from '../components/EscortCard.jsx';
import { Rise } from '../components/Bubble.jsx';
import { useToast } from '../components/Toast.jsx';
import { PinIcon, SpinnerIcon, ChevronR } from '../components/Icons.jsx';
import PlaceField from '../components/fields/PlaceField.jsx';
import ServicesPage, { ServicesField } from '../components/fields/ServicesPage.jsx';
import { Switch } from './settings/ui.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { useI18n, errorText } from '../lib/i18n.jsx';
import { refreshUnread } from '../lib/inbox.js';
import { timeAgo } from '../lib/time.js';

const RADII = [10, 25, 50, 100, null];
const SECTIONS = ['new', 'returning', 'moved', 'matches'];
const spring = { type: 'spring', stiffness: 420, damping: 34 };

// Vorschläge für Mitglieder: Präferenzen (Standort, Umkreis, Alter, Vorlieben) und passende Escorts
export default function Suggestions() {
  useDock({ mode: 'hidden' });
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const toast = useToast();
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const member = user && user.role !== 'escort';

  useEffect(() => {
    if (!member) return;
    api('/api/me/prefs')
      .then((p) => {
        setSaved(p);
        setForm(p);
        setEditing(!p.enabled);
      })
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

  async function persist(next) {
    setBusy(true);
    try {
      const p = await api('/api/me/prefs', { method: 'PUT', body: next });
      setSaved(p);
      setForm(p);
      return p;
    } catch (err) {
      toast(errorText(t, err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const p = await persist({ ...form, enabled: true });
    if (p) {
      setEditing(false);
      toast(t('sug.saved'));
    }
  }

  async function toggle(on) {
    const p = await persist({ ...form, enabled: on });
    if (p) {
      setEditing(!on);
      toast(on ? t('sug.on') : t('sug.off'));
    }
  }

  if (ready && !user) return <Navigate to="/login" replace state={{ from: '/suggestions' }} />;

  const head = (
    <PageHead wide title={t('sug.title')} text={t('sug.intro')}>
      {saved && (
        <span className="status-pill sug-switch">
          {enabled ? t('sug.active') : t('sug.inactive')}
          <Switch on={enabled} onChange={toggle} label={t('sug.enable')} />
        </span>
      )}
    </PageHead>
  );

  if (user && !member) {
    return (
      <Page>
        <div className="sug-page">
          {head}
          <Rise i={3} className="panel stats-empty">
            <p>{t('sug.membersOnly')}</p>
          </Rise>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="sug-page">
        {head}
        {!form ? (
          <div className="panel skeleton" style={{ height: 200, aspectRatio: 'auto' }} />
        ) : (
          <Rise i={3} className="panel sug-prefs">
            <div className="panel-title">
              <h2>{t('sug.prefsTitle')}</h2>
              {enabled && !editing && (
                <button type="button" className="status-pill" onClick={() => setEditing(true)}>
                  {t('feed.edit')}
                </button>
              )}
            </div>
            <AnimatePresence initial={false} mode="wait">
              {editing ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <PrefsForm
                    form={form}
                    setForm={setForm}
                    busy={busy}
                    enabled={enabled}
                    onSubmit={submit}
                    onCancel={
                      enabled
                        ? () => {
                            setForm(saved);
                            setEditing(false);
                          }
                        : null
                    }
                  />
                </motion.div>
              ) : (
                <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <PrefsSummary prefs={saved} />
                </motion.div>
              )}
            </AnimatePresence>
          </Rise>
        )}

        {saved && !enabled && (
          <Rise i={4} className="panel sug-explain">
            <ul>
              <li>{t('sug.explainNew')}</li>
              <li>{t('sug.explainReturning')}</li>
              <li>{t('sug.explainMoved')}</li>
              <li>{t('sug.explainMatch')}</li>
            </ul>
          </Rise>
        )}

        {enabled && <Results data={data} />}
      </div>
    </Page>
  );
}

function PrefsForm({ form, setForm, busy, enabled, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [svcOpen, setSvcOpen] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const hasPlace = Boolean(form.zip || form.city);

  return (
    <form className="form sug-form" onSubmit={onSubmit}>
      <div className="field full">
        <label>{t('sug.place')}</label>
        <PlaceField
          city={form.city}
          zip={form.zip}
          canton={form.canton}
          onChange={(p) => setForm((f) => ({ ...f, ...p }))}
          hint={t('sug.placeHint')}
        />
      </div>

      <div className="field full">
        <label>{t('sug.radius')}</label>
        <div className="range-switch sug-radius" role="radiogroup" aria-label={t('sug.radius')}>
          {RADII.map((r) => {
            const on = (form.radius ?? null) === r;
            const disabled = r !== null && !hasPlace;
            return (
              <button
                key={r ?? 'all'}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                className={on ? 'active' : ''}
                onClick={() => set('radius', r)}
              >
                {on && <motion.span layoutId="sug-radius" className="chip-bg" transition={spring} />}
                <span>{r ? t('sug.km', { n: r }) : t('sug.allSwitzerland')}</span>
              </button>
            );
          })}
        </div>
        {!hasPlace && <p className="field-hint">{t('sug.radiusHint')}</p>}
      </div>

      <div className="field">
        <label>{t('sug.ageFrom')}</label>
        <input
          className="input"
          type="number"
          min={18}
          max={99}
          value={form.ageMin ?? ''}
          onChange={(e) => set('ageMin', e.target.value)}
        />
      </div>
      <div className="field">
        <label>{t('sug.ageTo')}</label>
        <input
          className="input"
          type="number"
          min={18}
          max={99}
          value={form.ageMax ?? ''}
          onChange={(e) => set('ageMax', e.target.value)}
        />
      </div>

      <div className="field full">
        <label>{t('sug.likes')}</label>
        <ServicesField value={form.services} onOpen={() => setSvcOpen(true)} />
        <p className="field-hint">{t('sug.likesHint')}</p>
      </div>

      <div className="form-actions full">
        {onCancel && (
          <button type="button" className="ghost-btn" onClick={onCancel}>
            {t('feed.cancel')}
          </button>
        )}
        <button className="white-btn" disabled={busy}>
          {busy ? <SpinnerIcon /> : enabled ? t('editor.save') : t('sug.enableSave')}
        </button>
      </div>

      <ServicesPage
        open={svcOpen}
        value={form.services}
        title={t('sug.likes')}
        text={t('sug.likesText')}
        onSave={async (services) => {
          set('services', services);
          setSvcOpen(false);
        }}
        onBack={() => setSvcOpen(false)}
      />
    </form>
  );
}

function PrefsSummary({ prefs }) {
  const { t } = useI18n();
  const parts = [
    prefs.city
      ? `${prefs.city}${prefs.radius ? ` · ${t('sug.km', { n: prefs.radius })}` : ''}`
      : t('sug.allSwitzerland'),
    prefs.ageMin || prefs.ageMax
      ? t('sug.ageRange', { min: prefs.ageMin || 18, max: prefs.ageMax || 99 })
      : t('sug.anyAge'),
    t(prefs.services.length === 1 ? 'sug.likesOne' : 'sug.likesCount', { n: prefs.services.length }),
  ];
  return (
    <div className="sug-summary">
      <PinIcon width={14} height={14} />
      {parts.map((p, i) => (
        <span key={i}>{p}</span>
      ))}
    </div>
  );
}

// Hinweis auf der Karte: wann (neu, wieder da, umgezogen) und wie viele Vorlieben passen
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
      <Rise i={4} className="sug-section-head">
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
