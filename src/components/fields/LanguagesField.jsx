import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import Picker from './Picker.jsx';
import { CloseIcon, PlusIcon } from '../Icons.jsx';
import { LANGUAGE_CODES, LEVELS, languageName, parseLanguage, sortedOptions } from '../../lib/catalog.js';
import { useI18n } from '../../lib/i18n.jsx';

const spring = { type: 'spring', stiffness: 420, damping: 34 };

// Wert: ['de:native', 'en:fluent', …]
export default function LanguagesField({ value, onChange }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const anchor = useRef(null);
  const entries = value.map(parseLanguage).filter((e) => e.code);
  const selected = new Set(entries.map((e) => e.code));
  const options = useMemo(() => sortedOptions(LANGUAGE_CODES, (c) => languageName(c, locale)), [locale]);

  const write = (list) => onChange(list.map((e) => `${e.code}:${e.level}`));
  const toggle = (code) =>
    write(selected.has(code) ? entries.filter((e) => e.code !== code) : [...entries, { code, level: 'good' }]);
  const setLevel = (code, level) => write(entries.map((e) => (e.code === code ? { ...e, level } : e)));

  return (
    <div className="langs">
      <AnimatePresence initial={false}>
        {entries.map((e) => (
          <motion.div
            key={e.code}
            className="lang-row"
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={{ duration: 0.25 }}
          >
            <span className="lang-name">{languageName(e.code, locale)}</span>
            <div className="level-switch" role="radiogroup" aria-label={languageName(e.code, locale)}>
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  role="radio"
                  aria-checked={e.level === lv}
                  className={e.level === lv ? 'active' : ''}
                  onClick={() => setLevel(e.code, lv)}
                >
                  {e.level === lv && <motion.span layoutId={`lvl-${e.code}`} className="chip-bg" transition={spring} />}
                  <span>{t(`levels.${lv}`)}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="lang-remove"
              onClick={() => toggle(e.code)}
              aria-label={t('editor.removeLanguage')}
            >
              <CloseIcon width={16} height={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      {!entries.length && <div className="field-empty">{t('editor.noLanguages')}</div>}
      <div className="select-wrap">
        <button ref={anchor} type="button" className="toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <PlusIcon width={15} height={15} /> {t('editor.addLanguage')}
        </button>
        <Picker
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={anchor}
          options={options}
          selected={selected}
          onPick={toggle}
          multi
        />
      </div>
    </div>
  );
}
