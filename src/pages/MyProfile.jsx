import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { ChevronR } from '../components/Icons.jsx';
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
  const location = useLocation();
  const navigate = useNavigate();
  const servicesOpen = location.pathname === '/me/services';
  const closeServices = () => {
    if (location.state?.fromEditor) navigate(-1);
    else navigate('/me', { replace: true });
  };

  useEffect(() => {
    if (!user || user.role !== 'escort') return;
    api('/api/me/profile').then(setEscort).catch(() => setEscort(null));
    api('/api/health')
      .then((h) => setStorage(h.storage))
      .catch(() => {});
  }, [user]);

  if (ready && !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

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
      <div className="me-head">
        <div className="me-head-text">
          <Rise i={0} as="h1" className="me-title">
            {t('me.title')}
          </Rise>
          <Rise i={1} as="p" className="me-intro">
            {t('me.intro')}
          </Rise>
        </div>
        {escort && (
          <Rise i={2} className="me-status">
            <span className={`status-pill ${escort.published ? 'on' : 'off'}`}>
              <span className={`dot ${escort.published ? '' : 'off'}`} />
              {escort.published ? t('me.published') : t('me.draft')}
            </span>
            {escort.published && (
              <Link to={`/escort/${escort.slug}`} className="small-btn">
                {t('me.view')}
                <ChevronR width={14} height={14} />
              </Link>
            )}
          </Rise>
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
            servicesOpen={servicesOpen}
            onOpenServices={() => navigate('/me/services', { state: { fromEditor: true } })}
            onCloseServices={closeServices}
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
