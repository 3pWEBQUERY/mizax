import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Rise } from './Bubble.jsx';
import { useI18n } from '../lib/i18n.jsx';

const spring = { type: 'spring', stiffness: 420, damping: 34 };

// Aktiver Tab (Profil / Neuigkeiten) in der URL (?tab=posts), damit Links und Neuladen ihn behalten.
// `switched`: nach einem Wechsel starten die Einblend-Animationen im Panel wieder bei 0.
export function useProfileTab(resetKey) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'posts' ? 'posts' : 'profile';
  const [switched, setSwitched] = useState(false);
  useEffect(() => setSwitched(false), [resetKey]);
  const select = (next) => {
    setSwitched(true);
    setParams(
      (p) => {
        const q = new URLSearchParams(p);
        if (next === 'posts') q.set('tab', 'posts');
        else q.delete('tab');
        return q;
      },
      { replace: true },
    );
  };
  return { tab, switched, select };
}

export default function ProfileTabs({ active, onSelect, postCount, i = 0 }) {
  const { t } = useI18n();
  return (
    <Rise i={i} className="range-switch profile-tabs" role="tablist" aria-label={t('profile.tabs')}>
      {[
        ['profile', t('profile.tabProfile')],
        ['posts', t('feed.profileTitle'), postCount],
      ].map(([key, label, count]) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={`tab-${key}`}
          aria-selected={active === key}
          aria-controls="profile-panel"
          className={active === key ? 'active' : ''}
          onClick={() => onSelect(key)}
        >
          {active === key && <motion.span layoutId="profile-tab" className="chip-bg" transition={spring} />}
          <span>{label}</span>
          {count && <span className="tab-count">{count}</span>}
        </button>
      ))}
    </Rise>
  );
}

export const postCountLabel = (feed) => (feed.posts?.length ? `${feed.posts.length}${feed.done ? '' : '+'}` : null);
