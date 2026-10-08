import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon } from '../Icons.jsx';
import { useT } from '../../lib/i18n.jsx';

// Aufklappbare Liste mit Suchfeld; für Einfach- und Mehrfachauswahl
export default function Picker({ open, onClose, options, selected, onPick, multi = false, anchorRef }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const panelRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || anchorRef?.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, onClose, anchorRef]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? options.filter((o) => o.name.toLowerCase().includes(needle) || o.code.toLowerCase() === needle) : options;
  }, [options, q]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtered[active];
      if (o) {
        onPick(o.code);
        if (!multi) onClose();
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          className="picker"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          <input
            className="picker-search"
            autoFocus
            placeholder={t('editor.search')}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
          />
          <div className="picker-list" ref={listRef} role="listbox" aria-multiselectable={multi}>
            {filtered.length ? (
              filtered.map((o, idx) => {
                const isSel = selected.has(o.code);
                return (
                  <button
                    key={o.code}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    data-idx={idx}
                    className={`picker-item ${idx === active ? 'active' : ''} ${isSel ? 'selected' : ''}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => {
                      onPick(o.code);
                      if (!multi) onClose();
                    }}
                  >
                    {o.prefix && <span className="picker-prefix">{o.prefix}</span>}
                    <span className="picker-name">{o.name}</span>
                    {isSel && <CheckIcon width={15} height={15} />}
                  </button>
                );
              })
            ) : (
              <div className="picker-empty">{t('editor.noResults')}</div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
