import { motion } from 'framer-motion';
import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { pageVariants } from '../lib/motion.js';

const scrollPositions = new Map();

// Jede Seite ist ein eigener Scroll-Container. Beim Wechsel bleiben beide
// Seiten kurz übereinander stehen und blenden ineinander über.
export default function Page({ children, className = '' }) {
  const ref = useRef(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const el = ref.current;
    el.scrollTop = scrollPositions.get(pathname) || 0;
    const onScroll = () => scrollPositions.set(pathname, el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [pathname]);

  return (
    <motion.main
      ref={ref}
      className={`page ${className}`}
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      layoutScroll
    >
      <div className="page-inner">{children}</div>
    </motion.main>
  );
}
