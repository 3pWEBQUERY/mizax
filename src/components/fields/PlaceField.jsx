import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { PinIcon, SpinnerIcon } from '../Icons.jsx';
import { useToast } from '../Toast.jsx';
import { api } from '../../lib/api.js';
import { useI18n } from '../../lib/i18n.jsx';
import { cantonName, locate } from '../../lib/cantons.js';

// Ort aus dem Schweizer Ortsverzeichnis wählen (PLZ oder Name) oder per Standort bestimmen.
// Gespeichert wird nur der Ort (Ortszentrum), nie der genaue Standort.
export default function PlaceField({ city, zip, canton, onChange }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [text, setText] = useState(() => [zip, city].filter(Boolean).join(' '));
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [locating, setLocating] = useState(false);
  const wrapRef = useRef(null);
  const timer = useRef();

  useEffect(() => {
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  function search(value) {
    setText(value);
    clearTimeout(timer.current);
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const list = await api(`/api/places?q=${encodeURIComponent(q)}`);
        setResults(list);
        setActive(0);
        setOpen(true);
      } catch {
        /* ignore */
      }
    }, 160);
  }

  function choose(p) {
    setText(`${p.zip} ${p.name}`);
    setOpen(false);
    onChange({ city: p.name, zip: p.zip, canton: p.canton });
  }

  async function useLocation() {
    setLocating(true);
    try {
      const pos = await locate();
      const p = await api(`/api/places/nearest?lat=${pos.lat}&lng=${pos.lng}`);
      if (p) choose(p);
    } catch (err) {
      toast(err.code === 'denied' ? t('geo.denied') : t('geo.unavailable'));
    } finally {
      setLocating(false);
    }
  }

  function onKey(e) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="place-field" ref={wrapRef}>
      <div className="select-wrap">
        <input
          className="input"
          value={text}
          placeholder={t('editor.placePlaceholder')}
          onChange={(e) => {
            search(e.target.value);
            // freie Eingabe ohne Auswahl: Ort wird beim Speichern serverseitig gesucht
            onChange({ city: e.target.value.replace(/^\d{4}\s*/, ''), zip: (e.target.value.match(/^\d{4}/) || [''])[0], canton: '' });
          }}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKey}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
        />
        <AnimatePresence>
          {open && results.length > 0 && (
            <motion.div
              className="picker"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              <div className="picker-list" role="listbox">
                {results.map((p, idx) => (
                  <button
                    key={`${p.zip}-${p.name}`}
                    type="button"
                    role="option"
                    aria-selected={idx === active}
                    className={`picker-item ${idx === active ? 'active' : ''}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => choose(p)}
                  >
                    <span className="picker-prefix place-zip">{p.zip}</span>
                    <span className="picker-name">{p.name}</span>
                    <span className="place-canton">{p.canton}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="place-meta">
        <button type="button" className="toggle" onClick={useLocation} disabled={locating}>
          {locating ? <SpinnerIcon width={15} height={15} /> : <PinIcon />} {t('editor.useLocation')}
        </button>
        {canton && (
          <span className="place-chosen">
            {t('geo.canton')} {cantonName(canton, locale)}
          </span>
        )}
      </div>
      <div className="field-hint">{t('editor.placeHint')}</div>
    </div>
  );
}
