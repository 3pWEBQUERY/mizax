import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Rise } from '../components/Bubble.jsx';
import { ChevronR } from '../components/Icons.jsx';
import ProfileEditor from '../components/ProfileEditor.jsx';
import MemberEditor from '../components/MemberEditor.jsx';
import { useDock } from '../lib/dock.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/i18n.jsx';
import { api } from '../lib/api.js';
import { loadEscorts } from '../lib/store.js';
import { setOwnEscort } from '../lib/ownEscort.js';

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
    loadStorage(setStorage);
    api('/api/me/profile')
      .then((e) => {
        setEscort(e);
        setOwnEscort(user.id, e);
      })
      .catch(() => setEscort(null));
  }, [user]);

  if (ready && !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (user && user.role !== 'escort') return <MyMemberProfile />;

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
            <Link to="/me/abo" className="status-pill">
              {escort.plan ? escort.plan.name : t('billing.none')}
              <ChevronR width={12} height={12} />
            </Link>
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
        <Rise i={3} className="me-editor">
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
              setOwnEscort(user.id, e);
              loadEscorts(true).catch(() => {});
            }}
          />
        </Rise>
      )}
    </Page>
  );
}

function loadStorage(set) {
  api('/api/health')
    .then((h) => set(h.storage))
    .catch(() => {});
}

// Mitglieder: eigenes Profil (anders aufgebaut als Escort-Profile – ohne Leistungen und Honorar)
function MyMemberProfile() {
  const t = useT();
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [storage, setStorage] = useState(true);

  useEffect(() => {
    api('/api/me/member')
      .then(setMember)
      .catch(() => {});
    loadStorage(setStorage);
  }, []);

  return (
    <Page>
      <div className="me-head">
        <div className="me-head-text">
          <Rise i={0} as="h1" className="me-title">
            {t('me.title')}
          </Rise>
          <Rise i={1} as="p" className="me-intro">
            {t('me.introMember')}
          </Rise>
        </div>
        <Rise i={2} className="me-status">
          <Link to={`/member/${user.id}`} className="small-btn">
            {t('me.view')}
            <ChevronR width={14} height={14} />
          </Link>
        </Rise>
      </div>
      <Rise i={3} className="me-editor">
        {member ? (
          <MemberEditor member={member} storage={storage} onSaved={setMember} />
        ) : (
          <div className="skeleton" style={{ height: 320, aspectRatio: 'auto' }} />
        )}
      </Rise>
    </Page>
  );
}
