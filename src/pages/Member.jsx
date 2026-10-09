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
      <div className="member-page">
        {member ? (
          <>
            <div className="me-head member-head">
              <Rise i={0}>
                <Avatar name={member.name} size={56} />
              </Rise>
              <div className="me-head-text">
                <Rise i={0} as="h1" className="me-title">
                  {member.name}
                </Rise>
                <Rise i={1} as="p" className="me-intro">
                  {t('member.since', { date: since })}
                </Rise>
              </div>
              <Rise i={2} className="me-status">
                {member.self ? (
                  <Link to="/settings/account" className="small-btn">
                    <EditIcon width={14} height={14} />
                    {t('member.edit')}
                  </Link>
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
            </div>
            <div className="bubbles member-bubbles">
              {member.bio ? (
                <Bubble i={3}>{member.bio}</Bubble>
              ) : (
                <Bubble i={3} className="member-nobio">
                  {member.self ? t('member.noBioSelf') : t('member.noBio')}
                </Bubble>
              )}
              {member.self && <Bubble i={4} className="member-nobio">{t('member.selfHint')}</Bubble>}
            </div>
          </>
        ) : (
          <div className="me-head member-head">
            <span className="person skeleton" style={{ width: 56, height: 56 }} />
            <div className="me-head-text">
              <div className="skeleton-line" style={{ width: 160 }} />
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
