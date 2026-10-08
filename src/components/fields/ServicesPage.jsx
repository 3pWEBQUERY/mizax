import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bubble } from '../Bubble.jsx';
import { BackIcon, ChevronR, SpinnerIcon } from '../Icons.jsx';
import { SERVICE_GROUPS, serviceLabel } from '../../lib/catalog.js';
import { useT } from '../../lib/i18n.jsx';
import { ease } from '../../lib/motion.js';

const spring = { type: 'spring', stiffness: 420, damping: 34 };

// Feld im Editor: zeigt die Auswahl und öffnet die Leistungs-Seite
export function ServicesField({ value, onOpen }) {
  const t = useT();
  return (
    <button type="button" className="input services-field" onClick={onOpen}>
      <span className="services-chips">
        {value.length ? (
          <>
            {value.slice(0, 6).map((k) => (
              <span key={k} className="tag">
                {serviceLabel(t, k)}
              </span>
            ))}
            {value.length > 6 && <span className="tag">+{value.length - 6}</span>}
          </>
        ) : (
          <span className="select-placeholder">{t('editor.noServices')}</span>
        )}
      </span>
      <span className="services-open">
        {value.length ? t('editor.selected', { n: value.length }) : t('editor.chooseServices')}
        <ChevronR width={16} height={16} />
      </span>
    </button>
  );
}

// Eigene, animierte Seite zur Auswahl der Leistungen
export default function ServicesPage({ open, value, onSave, onBack }) {
  const t = useT();
  const [draft, setDraft] = useState(() => new Set(value));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setDraft(new Set(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onBack();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onBack]);

  const toggle = (k) =>
    setDraft((d) => {
      const n = new Set(d);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  // freie Altwerte (z. B. aus früheren Profilen) behalten
  const known = new Set(SERVICE_GROUPS.flatMap((g) => g.items));
  const legacy = [...draft].filter((k) => !known.has(k));

  async function save() {
    setBusy(true);
    try {
      const ordered = [...SERVICE_GROUPS.flatMap((g) => g.items).filter((k) => draft.has(k)), ...legacy];
      await onSave(ordered);
    } finally {
      setBusy(false);
    }
  }

  // Portal in den App-Container: liegt so über der Seite, aber unter der Kopfzeile
  const host = document.querySelector('.app') || document.body;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="svc-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.4, ease } }}
          exit={{ opacity: 0, transition: { duration: 0.3, ease } }}
          role="dialog"
          aria-modal="true"
          aria-label={t('services.title')}
        >
          <div className="svc-inner">
            <motion.button
              type="button"
              className="ghost-btn svc-back"
              onClick={onBack}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.05, duration: 0.4, ease } }}
            >
              <BackIcon width={18} height={18} /> {t('services.back')}
            </motion.button>
            <div className="bubbles" style={{ margin: '0 0 26px', maxWidth: 560 }}>
              <Bubble i={0}>{t('services.title')}</Bubble>
              <Bubble i={1}>{t('services.text')}</Bubble>
            </div>

            {SERVICE_GROUPS.map((g, gi) => (
              <motion.section
                key={g.key}
                className="svc-group"
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.55, ease, delay: 0.15 + gi * 0.06 }}
              >
                <h3>{t(`services.groups.${g.key}`)}</h3>
                <div className="svc-chips">
                  {g.items.map((k) => {
                    const on = draft.has(k);
                    return (
                      <motion.button
                        key={k}
                        type="button"
                        className={`chip svc-chip ${on ? 'active' : ''}`}
                        onClick={() => toggle(k)}
                        aria-pressed={on}
                        whileTap={{ scale: 0.95 }}
                      >
                        <AnimatePresence initial={false}>
                          {on && (
                            <motion.span
                              className="chip-bg"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={spring}
                            />
                          )}
                        </AnimatePresence>
                        <span>{serviceLabel(t, k)}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.section>
            ))}

            {legacy.length > 0 && (
              <section className="svc-group">
                <div className="svc-chips">
                  {legacy.map((k) => (
                    <button key={k} type="button" className="chip svc-chip active" onClick={() => toggle(k)} aria-pressed>
                      <span className="chip-bg" />
                      <span>{k}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <motion.div
            className="svc-bar"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { ...spring, delay: 0.2 } }}
          >
            <button type="button" className="ghost-btn" onClick={onBack}>
              {t('services.back')}
            </button>
            <button type="button" className="white-btn" onClick={save} disabled={busy}>
              {busy ? <SpinnerIcon /> : `${t('services.save')} · ${draft.size}`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    host,
  );
}
