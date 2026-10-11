import { motion } from 'framer-motion';
import { forwardRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMedia } from '../../lib/useMedia.js';

const GAP = 8;
const MARGIN = 12;

// Position neben dem Auslöser: unterhalb, oder oberhalb wenn unten zu wenig Platz ist
function measure(anchor, width, align) {
  const r = anchor.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const w = Math.min(width === 'anchor' ? r.width : Math.max(r.width, width), vw - 2 * MARGIN);
  const left = Math.max(MARGIN, Math.min(align === 'right' ? r.right - w : r.left, vw - w - MARGIN));
  const below = vh - r.bottom - GAP - MARGIN;
  const above = r.top - GAP - MARGIN;
  const up = below < 260 && above > below;
  return up
    ? { left, width: w, bottom: vh - r.top + GAP, maxHeight: above, up }
    : { left, width: w, top: r.bottom + GAP, maxHeight: below, up };
}

// Schwebendes Auswahlfenster: wird im <body> gerendert und am Auslöser ausgerichtet, damit es
// nicht von Karten (eigene Stapel- und Blur-Ebenen) verdeckt oder abgeschnitten wird.
// `sheet`: auf schmalen Bildschirmen stattdessen als Leiste über dem Dock (per CSS positioniert).
const Floating = forwardRef(function Floating(
  { anchorRef, width = 280, align = 'left', sheet = false, className = '', children },
  ref,
) {
  const narrow = useMedia('(max-width: 720px)');
  const asSheet = sheet && narrow;
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (asSheet) return undefined;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => anchorRef.current && setPos(measure(anchorRef.current, width, align)));
    };
    if (anchorRef.current) setPos(measure(anchorRef.current, width, align));
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorRef, width, align, asSheet]);

  if (!asSheet && !pos) return null;
  const up = !asSheet && pos.up;
  const style = asSheet
    ? undefined
    : {
        left: pos.left,
        width: pos.width,
        top: pos.top,
        bottom: pos.bottom,
        maxHeight: pos.maxHeight,
        transformOrigin: `${align === 'right' ? 'right' : 'left'} ${up ? 'bottom' : 'top'}`,
      };

  return createPortal(
    <motion.div
      ref={ref}
      className={`picker ${asSheet ? 'picker-sheet' : ''} ${className}`}
      style={style}
      initial={{ opacity: 0, y: up ? 6 : -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: up ? 4 : -4, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
    >
      {children}
    </motion.div>,
    document.body,
  );
});

export default Floating;
