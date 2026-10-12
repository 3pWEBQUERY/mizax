import { motion } from 'framer-motion';
import { forwardRef } from 'react';

const pillSpring = { type: 'spring', stiffness: 420, damping: 36 };

// Filter-Chip (Startseite, Vorschläge); aktiv mit weisser Pille, die per layoutId zum nächsten Chip gleitet
const Chip = forwardRef(function Chip({ active, onClick, children, layoutId, className = '', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`chip ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
      {...rest}
    >
      {active && <motion.span layoutId={layoutId} className="chip-bg" transition={pillSpring} />}
      <span>{children}</span>
    </button>
  );
});

export default Chip;
