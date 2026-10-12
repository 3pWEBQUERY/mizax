import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import Floating from './fields/Floating.jsx';

// Kleines Aktionsmenü am „⋯“-Knopf (Beiträge, Profile, Chat). Schwebt im <body>, damit es
// nicht von nachfolgenden Karten mit eigener Blur-/Stapelebene überdeckt wird.
export default function PopMenu({ open, onClose, anchorRef, width = 200, align = 'right', children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (anchorRef.current?.contains(e.target) || ref.current?.contains(e.target)) return;
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
        <Floating ref={ref} anchorRef={anchorRef} width={width} align={align} className="pop-menu">
          <div role="menu">{children}</div>
        </Floating>
      )}
    </AnimatePresence>
  );
}
