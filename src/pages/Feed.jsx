import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import PageHead from '../components/PageHead.jsx';
import { Rise } from '../components/Bubble.jsx';
import { ChevronR } from '../components/Icons.jsx';
import { Composer, PostList, usePosts } from '../components/Feed.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { useI18n } from '../lib/i18n.jsx';

const spring = { type: 'spring', stiffness: 420, damping: 34 };

export default function FeedPage() {
  useDock({ mode: 'hidden' });
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const [params] = useSearchParams();
  const [scope, setScope] = useState('all');
  const feed = usePosts(user ? `/api/feed?scope=${scope}` : null);
  const escort = user?.role === 'escort';

  if (ready && !user) {
    return (
      <Page>
        <div className="feed-col">
          <PageHead title={t('feed.title')} text={t('feed.guest')}>
            <Link to="/register" className="status-pill">
              {t('menu.register')}
            </Link>
            <Link to="/login" className="small-btn">
              {t('menu.login')}
              <ChevronR width={14} height={14} />
            </Link>
          </PageHead>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="feed-col">
        <PageHead title={t('feed.title')} text={escort ? t('feed.introEscort') : t('feed.introMember')} />
        <Rise i={2} className="feed-tabs">
          {[
            ['all', t('feed.all')],
            ['favorites', t('feed.favorites')],
          ].map(([key, label]) => (
            <button key={key} type="button" className={`chip ${scope === key ? 'active' : ''}`} onClick={() => setScope(key)}>
              {scope === key && <motion.span layoutId="feed-scope" className="chip-bg" transition={spring} />}
              <span>{label}</span>
            </button>
          ))}
        </Rise>
        {escort && (
          <Rise i={3}>
            <Composer onPosted={feed.prepend} autoFocus={params.get('compose') === '1'} />
          </Rise>
        )}
        <Rise i={4}>
          <PostList feed={feed} empty={scope === 'favorites' ? t('feed.emptyFavorites') : t('feed.empty')} />
        </Rise>
      </div>
    </Page>
  );
}
