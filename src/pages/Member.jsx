import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import Avatar from '../components/Avatar.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { ChatIcon, EditIcon, ChevronR } from '../components/Icons.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { useI18n, errorText } from '../lib/i18n.jsx';

// Öffentliches Mitgliederprofil – sichtbar für Escorts (z. B. nach einer Anfrage) und für das Mitglied selbst
export default function Member() {
  useDock({ mode: 'hidden' });
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { user, ready } = useAuth();
  const location = useLocation();
  const [member, setMember] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    setMember(null);
    setError(null);
    api(`/api/members/${id}`)
      .then((m) => {
        setMember(m);
        if (!m.self) api(`/api/members/${id}/view`, { method: 'POST' }).catch(() => {});
      })
      .catch(setError);
  }, [id, user]);

  if (ready && !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (member?.escortSlug) return <Navigate to={`/escort/${member.escortSlug}`} replace />;

  if (error) {
    return (
      <Page>
        <div className="bubbles">
          <Bubble i={0}>{errorText(t, error)}</Bubble>
        </div>
      </Page>
    );
  }

  const since =
    member && new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(member.createdAt));

  return (
    <Page>
      <div className="member-card-wrap">
        {member ? (
          <>
            <Rise i={0} className="member-card">
              <Avatar name={member.name} size={96} />
              <h1>{member.name}</h1>
              <span className="role-badge member">{t('menu.member')}</span>
              <small>{t('member.since', { date: since })}</small>
            </Rise>
            {member.bio ? (
              <Bubble i={1} className="member-bio">
                {member.bio}
              </Bubble>
            ) : (
              <Rise i={1} as="p" className="me-intro member-nobio">
                {member.self ? t('member.noBioSelf') : t('member.noBio')}
              </Rise>
            )}
            <Rise i={2} className="member-actions">
              {member.self ? (
                <>
                  <p className="me-intro">{t('member.selfHint')}</p>
                  <Link to="/settings/account" className="small-btn">
                    <EditIcon width={14} height={14} />
                    {t('member.edit')}
                  </Link>
                </>
              ) : (
                member.conversationId && (
                  <Link to={`/messages/${member.conversationId}`} className="small-btn">
                    <ChatIcon width={14} height={14} />
                    {t('member.openChat')}
                    <ChevronR width={14} height={14} />
                  </Link>
                )
              )}
            </Rise>
          </>
        ) : (
          <div className="member-card">
            <span className="person skeleton" style={{ width: 96, height: 96 }} />
            <div className="skeleton-line" style={{ width: 140 }} />
          </div>
        )}
      </div>
    </Page>
  );
}
