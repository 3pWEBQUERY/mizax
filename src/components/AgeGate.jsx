import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Bubble, Rise } from './Bubble.jsx';

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

  return (
    <AnimatePresence>
      {!ok && (
        <motion.div
          className="gate"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
          role="dialog"
          aria-modal="true"
          aria-label="Altersbestätigung"
        >
          <div className="bubbles">
            <Bubble i={0}>Hey, willkommen bei Mizax.</Bubble>
            <Bubble i={1}>
              Diese Seite enthält Inhalte, die nur für Erwachsene bestimmt sind. Bitte bestätige, dass du
              mindestens 18 Jahre alt bist.
            </Bubble>
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
                Ich bin 18 oder älter
              </button>
              <a className="ghost-btn" href="https://www.google.de" rel="noreferrer">
                Verlassen
              </a>
            </Rise>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
