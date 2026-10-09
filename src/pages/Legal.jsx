import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { useDock } from '../lib/dock.jsx';
import { useI18n } from '../lib/i18n.jsx';
import { PRIVACY, TERMS } from '../legal/content.js';
import { LEGAL_UPDATED } from '../legal/operator.js';

function LegalPage({ titleKey, sections, other }) {
  useDock({ mode: 'hidden' });
  const { t, locale } = useI18n();
  return (
    <Page>
      <div className="legal">
        <div className="bubbles" style={{ maxWidth: 760, margin: '0 0 18px' }}>
          <Bubble i={0}>{t(titleKey)}</Bubble>
          {locale !== 'de' && <Bubble i={1}>{t('legal.germanOnly')}</Bubble>}
        </div>
        <Rise i={2} className="legal-meta">
          {t('legal.updated', { date: LEGAL_UPDATED })}
        </Rise>
        <Rise i={3} as="article" className="panel legal-body" lang="de">
          {sections.map((s, idx) => (
            <motion.section
              key={s.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.2 + Math.min(idx, 8) * 0.04 }}
            >
              <h2>{s.title}</h2>
              {s.body.map((b, i) =>
                typeof b === 'string' ? (
                  <p key={i}>{b}</p>
                ) : (
                  <ul key={i}>
                    {b.list.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ),
              )}
            </motion.section>
          ))}
        </Rise>
        <div className="legal-other">
          <Link to={other.to} className="ghost-btn">
            {t(other.label)}
          </Link>
        </div>
      </div>
    </Page>
  );
}

export function Privacy() {
  return (
    <LegalPage
      titleKey="legal.privacyTitle"
      sections={PRIVACY}
      other={{ to: '/agb', label: 'legal.termsTitle' }}
    />
  );
}

export function Terms() {
  return (
    <LegalPage
      titleKey="legal.termsTitle"
      sections={TERMS}
      other={{ to: '/datenschutz', label: 'legal.privacyTitle' }}
    />
  );
}

// Kleine Linkzeile (Startseite, Menü, Altersabfrage)
export function LegalLinks({ className = '' }) {
  const { t } = useI18n();
  return (
    <nav className={`legal-links ${className}`} aria-label={t('legal.privacyTitle')}>
      <Link to="/agb">{t('legal.terms')}</Link>
      <span aria-hidden="true">·</span>
      <Link to="/datenschutz">{t('legal.privacy')}</Link>
    </nav>
  );
}
