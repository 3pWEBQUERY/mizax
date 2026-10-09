import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LegalLinks } from '../pages/Legal.jsx';
import { Bubble, Rise } from './Bubble.jsx';
import { LanguagePicker } from './TopBar.jsx';
import { useT } from '../lib/i18n.jsx';

const KEY = 'mizax.age-ok';

function accepted() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export default function AgeGate() {
  const [ok, setOk] = useState(accepted);
  const t = useT();
  // Rechtstexte sollen auch ohne Altersbestätigung lesbar sein
  const { pathname } = useLocation();
  const legalPage = pathname === '/agb' || pathname === '/datenschutz';

  return (
    <AnimatePresence>
      {!ok && !legalPage && (
        <motion.div
          className="gate"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
          role="dialog"
          aria-modal="true"
          aria-label={t('gate.aria')}
        >
          <div className="bubbles">
            <Bubble i={0}>{t('gate.hello')}</Bubble>
            <Bubble i={1}>{t('gate.text')}</Bubble>
            <Rise i={2} className="actions">
              <button
                type="button"
                className="white-btn"
                autoFocus
                onClick={() => {
                  try {
                    localStorage.setItem(KEY, '1');
                  } catch {
                    /* ignore */
                  }
                  setOk(true);
                }}
              >
                {t('gate.confirm')}
              </button>
              <a className="ghost-btn" href="https://www.google.com" rel="noreferrer">
                {t('gate.leave')}
              </a>
            </Rise>
            <Rise i={3} style={{ width: '100%', maxWidth: 300, marginTop: 8 }}>
              <LanguagePicker id="gate-lang" />
            </Rise>
            <Rise i={4}>
              <LegalLinks />
            </Rise>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
