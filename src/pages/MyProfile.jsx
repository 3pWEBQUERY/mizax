import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import ProfileEditor from '../components/ProfileEditor.jsx';
import { useDock } from '../lib/dock.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/i18n.jsx';
import { api } from '../lib/api.js';
import { loadEscorts } from '../lib/store.js';

export default function MyProfile() {
  useDock({ mode: 'hidden' });
  const t = useT();
  const { user, ready } = useAuth();
  const [escort, setEscort] = useState(undefined); // undefined = lädt, null = noch keins
  const [storage, setStorage] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'escort') return;
    api('/api/me/profile').then(setEscort).catch(() => setEscort(null));
    api('/api/health')
      .then((h) => setStorage(h.storage))
      .catch(() => {});
  }, [user]);

  if (ready && !user) return <Navigate to="/login" replace state={{ from: '/me' }} />;

  if (user && user.role !== 'escort') {
    return (
      <Page>
        <div className="bubbles">
          <Bubble i={0}>{t('me.title')}</Bubble>
          <Bubble i={1}>{t('me.onlyEscorts')}</Bubble>
          <Rise i={2}>
            <Link to="/" className="white-btn">
              {t('fav.discover')}
            </Link>
          </Rise>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="bubbles" style={{ maxWidth: 760 }}>
        <Bubble i={0}>{t('me.title')}</Bubble>
        <Bubble i={1}>{t('me.intro')}</Bubble>
        {escort && (
          <Bubble i={2}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={`dot ${escort.published ? '' : 'off'}`} />
              {escort.published ? t('me.published') : t('me.draft')}
              {escort.published && (
                <Link to={`/escort/${escort.slug}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>
                  {t('me.view')}
                </Link>
              )}
            </span>
          </Bubble>
        )}
      </div>
      {escort !== undefined && user && (
        <Rise i={3} className="panel" style={{ maxWidth: 760, margin: '0 auto', padding: 20 }}>
          <ProfileEditor
            key={escort?.id || 'new'}
            mode="self"
            escort={escort}
            storage={storage}
            defaults={{ name: user.name }}
            onSaved={(e) => {
              setEscort(e);
              loadEscorts(true).catch(() => {});
            }}
          />
        </Rise>
      )}
    </Page>
  );
}
