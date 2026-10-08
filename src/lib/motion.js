export const ease = [0.22, 1, 0.36, 1];

// Gemeinsame Übergangskurve für Seitenwechsel und geteilte Elemente
export const layoutTransition = { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 };

export const pageVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.45, ease } },
  exit: { opacity: 0, transition: { duration: 0.3, ease } },
};

export const rise = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease, delay: 0.06 + i * 0.07 },
  }),
  exit: { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.25, ease } },
};
