import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import Avatar from '../components/Avatar.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { ChatIcon, EditIcon, ChevronR, PinIcon } from '../components/Icons.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { useMedia } from '../lib/useMedia.js';
import { useI18n, errorText } from '../lib/i18n.jsx';
import { interestLabel, languageName, parseLanguage } from '../lib/catalog.js';
import { cantonName } from '../lib/cantons.js';

// Mitgliederprofil – sichtbar für Escorts (z. B. nach einer Anfrage), die Verwaltung und das Mitglied selbst.
// Anders aufgebaut als ein Escort-Profil: Profilbild, Steckbrief, Über mich, Interessen.
export default function Member() {
  useDock({ mode: 'hidden' });
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { user, ready } = useAuth();
  const location = useLocation();
  const [member, setMember] = useState(null);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(false);
  const size = useMedia('(max-width: 640px)') ? 76 : 104;

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

  if (!member) {
    return (
      <Page>
        <div className="member-page">
          <div className="member-hero">
            <span className="person skeleton" style={{ width: size, height: size }} />
            <div className="member-hero-text">
              <div className="skeleton-line" style={{ width: 180, height: 22 }} />
              <div className="skeleton-line" style={{ width: 240 }} />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  const since = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(member.createdAt));
  const place = [member.zip, member.city].filter(Boolean).join(' ');
  const paragraphs = member.bio
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const facts = [
    [t('profile.age'), member.age ? t('profile.years', { n: member.age }) : null],
    [t('mp.livesIn'), place],
    [t('geo.canton'), member.canton ? cantonName(member.canton, locale) : null],
    [
      t('profile.languages'),
      member.languages
        .map(parseLanguage)
        .map((l) => (l.code ? `${languageName(l.code, locale)} · ${t(`levels.${l.level}`)}` : l.raw))
        .join('\n'),
    ],
  ].filter(([, v]) => v);
  let i = 2;

  return (
    <Page>
      <div className="member-page">
        <Rise i={0} className="member-hero">
          {member.avatar ? (
            <button
              type="button"
              className="member-avatar"
              onClick={() => setZoom(true)}
              aria-label={t('profile.zoom')}
            >
              <Avatar name={member.name} thumb={member.avatar.thumb} size={size} />
            </button>
          ) : (
            <Avatar name={member.name} size={size} className="member-avatar" />
          )}
          <div className="member-hero-text">
            <h1 className="member-name">
              {member.name}
              {member.age && <span className="age">, {member.age}</span>}
            </h1>
            {member.tagline && <p className="member-tagline">{member.tagline}</p>}
            <p className="member-meta">
              {member.city && (
                <span>
                  <PinIcon width={14} height={14} />
                  {member.city}
                  {member.canton && ` · ${member.canton}`}
                </span>
              )}
              <span>{t('member.since', { date: since })}</span>
            </p>
          </div>
          <div className="member-actions">
            {member.self ? (
              <Link to="/me" className="small-btn">
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
          </div>
        </Rise>

        {member.self && (
          <Rise i={1} as="p" className="member-note">
            {t('member.selfHint')}
          </Rise>
        )}

        <div className="member-cards">
          <Rise i={i++} className="profile-card member-about">
            <h2 className="profile-card-title">{t('settings.about')}</h2>
            {paragraphs.length ? (
              paragraphs.map((p, idx) => (
                <p key={idx} className="profile-text">
                  {p}
                </p>
              ))
            ) : (
              <p className="profile-text member-empty">{member.self ? t('member.noBioSelf') : t('member.noBio')}</p>
            )}
          </Rise>

          {facts.length > 0 && (
            <Rise i={i++} className="profile-card">
              <h2 className="profile-card-title">{t('profile.details')}</h2>
              <dl className="facts" style={{ margin: 0 }}>
                {facts.map(([k, v]) => (
                  <div className="fact" key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </Rise>
          )}

          {member.interests.length > 0 && (
            <Rise i={i++} className="profile-card">
              <h2 className="profile-card-title">{t('mp.interests')}</h2>
              <div className="tags">
                {member.interests.map((k) => (
                  <span className="tag" key={k}>
                    {interestLabel(t, k)}
                  </span>
                ))}
              </div>
            </Rise>
          )}
        </div>
      </div>

      <AnimatePresence>
        {zoom && member.avatar && (
          <Lightbox
            photos={[{ id: 'avatar', ...member.avatar }]}
            index={0}
            onIndex={() => {}}
            onClose={() => setZoom(false)}
            name={member.name}
            t={t}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}
