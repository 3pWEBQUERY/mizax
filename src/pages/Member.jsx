import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Photo } from '../components/Media.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { ChatIcon, EditIcon, PinIcon } from '../components/Icons.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDock } from '../lib/dock.jsx';
import { useI18n, errorText } from '../lib/i18n.jsx';
import { interestLabel, languageName, parseLanguage } from '../lib/catalog.js';
import { cantonName } from '../lib/cantons.js';
import ProfileTabs, { useProfileTab, postCountLabel } from '../components/ProfileTabs.jsx';
import { Composer, PostList, usePosts } from '../components/feed/index.js';

// Mitgliederprofil – sichtbar für alle angemeldeten Konten. Gleicher Aufbau wie ein Escort-Profil
// (Bild links, Steckbrief rechts), aber mit Über mich, Details, Interessen und eigenem Feed statt
// Leistungen, Honorar und Kontaktdaten.
export default function Member() {
  useDock({ mode: 'hidden' });
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { user, ready } = useAuth();
  const location = useLocation();
  const [member, setMember] = useState(null);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(false);
  const { tab: urlTab, switched, select } = useProfileTab(id);
  const tab = urlTab === 'posts' ? 'posts' : 'profile';
  const feed = usePosts(user ? `/api/members/${encodeURIComponent(id)}/posts` : null);

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
        <div className="profile">
          <div className="profile-hero">
            <div className="hero-media skeleton" />
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
  let i = 6;
  let j = 0;

  return (
    <Page>
      <div className="profile member-profile">
        <div className="profile-hero">
          <div className="hero-media" style={{ borderRadius: 28 }}>
            <div className="media-fill">
              <Photo
                src={member.avatar?.url}
                lowSrc={member.avatar?.thumb}
                escort={{ name: member.name }}
                alt={member.name}
                big
                eager
              />
            </div>
            {member.avatar && <button type="button" aria-label={t('profile.zoom')} onClick={() => setZoom(true)} />}
          </div>
        </div>

        <div className="profile-body">
          <div className="bubbles">
            <Rise i={0} className="profile-sub">
              <span className="role-badge member">{t('menu.member')}</span>
              {member.city && (
                <span className="member-place">
                  <PinIcon width={14} height={14} />
                  {member.city}
                  {member.canton && ` · ${member.canton}`}
                </span>
              )}
            </Rise>
            <Rise i={1} as="h1" className="profile-title">
              {member.name}
              {member.age && (
                <>
                  , <span className="age">{member.age}</span>
                </>
              )}
            </Rise>
            {member.tagline && (
              <Rise i={2} className="profile-tagline">
                {member.tagline}
              </Rise>
            )}
            <Rise i={3} as="p" className="member-since">
              {t('member.since', { date: since })}
            </Rise>

            {(member.self || member.conversationId) && (
              <Rise i={4} className="actions">
                {member.self ? (
                  <Link to="/me" className="white-btn">
                    <EditIcon /> {t('member.edit')}
                  </Link>
                ) : (
                  <Link to={`/messages/${member.conversationId}`} className="white-btn">
                    <ChatIcon /> {t('member.openChat')}
                  </Link>
                )}
              </Rise>
            )}
            {member.self && (
              <Rise i={5} as="p" className="member-note">
                {t('member.selfHint')}
              </Rise>
            )}

            <ProfileTabs
              tabs={[
                { key: 'profile', label: t('profile.tabProfile') },
                { key: 'posts', label: t('feed.profileTitle'), count: postCountLabel(feed) },
              ]}
              active={tab}
              onSelect={select}
              i={i++}
            />

            <div key={tab} className="profile-panel" id="profile-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
              {tab === 'posts' ? (
                <Rise i={switched ? 0 : i++} className="profile-posts">
                  {member.self && <Composer onPosted={feed.prepend} />}
                  <PostList
                    feed={feed}
                    empty={member.self ? t('feed.emptySelf') : t('feed.emptyOwn', { name: member.name })}
                  />
                </Rise>
              ) : (
                <div className="member-cards">
                  <Rise i={switched ? j++ : i++} className="profile-card member-about">
                    <h2 className="profile-card-title">{t('settings.about')}</h2>
                    {paragraphs.length ? (
                      paragraphs.map((p, idx) => (
                        <p key={idx} className="profile-text">
                          {p}
                        </p>
                      ))
                    ) : (
                      <p className="profile-text member-empty">
                        {member.self ? t('member.noBioSelf') : t('member.noBio')}
                      </p>
                    )}
                  </Rise>

                  {facts.length > 0 && (
                    <Rise i={switched ? j++ : i++} className="profile-card">
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
                    <Rise i={switched ? j++ : i++} className="profile-card">
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
              )}
            </div>
          </div>
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
