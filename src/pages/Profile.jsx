import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { Photo } from '../components/Media.jsx';
import { CheckIcon, ChatIcon, PhoneIcon, MailIcon, HeartIcon, LockIcon, WhatsAppIcon, FeedIcon } from '../components/Icons.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { Composer, PostList, usePosts } from '../components/Feed.jsx';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { countryName, flag, languageName, parseLanguage, serviceLabel } from '../lib/catalog.js';
import { cantonName } from '../lib/cantons.js';
import { useAuth } from '../lib/auth.jsx';
import { useEscort, useFavorites, toggleFavorite, preloadImage } from '../lib/store.js';
import { useDock, useDockState } from '../lib/dock.jsx';
import { contactLinks } from '../lib/contact.js';
import { layoutTransition } from '../lib/motion.js';

const kindIcon = { whatsapp: WhatsAppIcon, call: PhoneIcon, mail: MailIcon, sms: ChatIcon };

export default function Profile() {
  const { slug } = useParams();
  const { escort, error } = useEscort(slug);
  const favs = useFavorites();
  const { messageOpen, setMessageOpen } = useDockState();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [active, setActive] = useState(0);
  const locked = Boolean(escort && !escort.full);
  const [lightbox, setLightbox] = useState(false);
  const own = Boolean(user && escort?.userId === user.id);

  // Aufruf für die Statistik zählen (einmal pro Seitenaufruf, eigenes Profil zählt serverseitig nicht)
  useEffect(() => {
    api(`/api/escorts/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {});
  }, [slug]);

  useDock(
    escort
      ? {
          mode: 'message',
          locked: !user,
          escort: {
            inbox: Boolean(escort.inbox && user && !own),
            slug: escort.slug,
            name: escort.name,
            phone: escort.phone,
            whatsapp: escort.whatsapp,
            email: escort.email,
          },
        }
      : { mode: 'search' },
  );

  useEffect(() => {
    if (escort) document.title = `${escort.name}, ${escort.age} – Mizax`;
    return () => {
      document.title = 'Mizax';
    };
  }, [escort]);

  useEffect(() => {
    escort?.photos.forEach((p) => preloadImage(p.url));
  }, [escort]);

  if (!escort) {
    if (error) {
      return (
        <Page>
          <div className="bubbles">
            <Bubble i={0}>{t('profile.notFound')}</Bubble>
            <Rise i={1}>
              <Link to="/" className="white-btn">
                {t('profile.backToList')}
              </Link>
            </Rise>
          </div>
        </Page>
      );
    }
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

  const photos = escort.photos;
  const current = photos[active] || photos[0];
  const isFav = favs.has(escort.slug);
  const links = locked ? [] : contactLinks(escort, '', t).filter((l) => l.kind !== 'sms');
  const paragraphs = (escort.bio || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const facts = [
    [t('profile.age'), t('profile.years', { n: escort.age })],
    [t('profile.height'), escort.height ? `${escort.height} cm` : null],
    [
      t('profile.origin'),
      /^[A-Z]{2}$/.test(escort.nationality || '')
        ? `${flag(escort.nationality)} ${countryName(escort.nationality, locale)}`
        : escort.nationality,
    ],
    [t('profile.place'), [escort.zip, escort.city].filter(Boolean).join(' ')],
    [t('geo.canton'), escort.canton ? cantonName(escort.canton, locale) : null],
    [
      t('profile.languages'),
      (escort.languages || [])
        .map(parseLanguage)
        .map((l) => (l.code ? `${languageName(l.code, locale)} · ${t(`levels.${l.level}`)}` : l.raw))
        .join('\n'),
    ],
  ].filter(([, v]) => v);
  let i = 0;

  return (
    <Page>
      <div className="profile">
        <div className="profile-hero">
          <motion.div
            layoutId={`media-${escort.slug}`}
            className="hero-media"
            style={{ borderRadius: 28 }}
            transition={layoutTransition}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={current?.id || 'none'}
                className="media-fill"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                <Photo src={current?.url} lowSrc={current?.thumb} escort={escort} alt={escort.name} big eager />
              </motion.div>
            </AnimatePresence>
            {current && <button type="button" aria-label={t('profile.zoom')} onClick={() => setLightbox(true)} />}
          </motion.div>

          {photos.length > 1 && (
            <Rise i={1} className="thumbs">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  className={`thumb ${idx === active ? 'active' : ''}`}
                  onClick={() => setActive(idx)}
                  aria-label={t('profile.photo', { n: idx + 1 })}
                >
                  <img src={p.thumb} alt="" loading="lazy" />
                </button>
              ))}
            </Rise>
          )}
        </div>

        <div className="profile-body">
          <div className="bubbles">
            <Rise i={i++} className="profile-sub">
              {escort.verified && (
                <span className="badge light">
                  <CheckIcon /> {t('card.verified')}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className={`dot ${escort.available ? '' : 'off'}`} />
                {escort.available ? t('profile.available') : t('profile.unavailable')}
              </span>
            </Rise>
            <Rise i={i++} as="h1" className="profile-title">
              {escort.name}, <span className="age">{escort.age}</span>
            </Rise>
            {locked && (
              <Rise i={i++} className="locked">
                <div className="lock-icon">
                  <LockIcon />
                </div>
                <h3>{t('profile.lockedTitle')}</h3>
                <p>{t('profile.lockedText')}</p>
                <div className="actions">
                  <Link to="/register" className="white-btn">
                    {t('menu.register')}
                  </Link>
                  <Link to="/login" className="ghost-btn">
                    {t('menu.login')}
                  </Link>
                </div>
              </Rise>
            )}
            {escort.tagline && (
              <Rise i={i++} className="profile-tagline">
                {escort.tagline}
              </Rise>
            )}

            {!locked && (
            <Rise i={i++} className="actions">
              {!own && (
                <button
                  type="button"
                  className={`white-btn ${messageOpen ? 'pressed' : ''}`}
                  data-message-toggle
                  aria-expanded={messageOpen}
                  onClick={() => setMessageOpen(!messageOpen)}
                >
                  <ChatIcon /> {t('profile.write')}
                </button>
              )}
              {links.map((l) => {
                const Icon = kindIcon[l.kind];
                return (
                  <a
                    key={l.kind}
                    href={l.href}
                    className="ghost-btn"
                    target={l.kind === 'whatsapp' ? '_blank' : undefined}
                    rel="noreferrer"
                  >
                    <Icon /> {l.label}
                  </a>
                );
              })}
              <button
                type="button"
                className="ghost-btn save-btn"
                onClick={() => toggleFavorite(escort.slug).catch(() => {})}
                aria-pressed={isFav}
                aria-label={isFav ? t('profile.saved') : t('profile.save')}
                title={isFav ? t('profile.saved') : t('profile.save')}
                style={isFav ? { color: '#ff5c8a' } : undefined}
              >
                <HeartIcon filled={isFav} width={20} height={20} />
              </button>
            </Rise>
            )}


            {paragraphs.length > 0 && (
              <Rise i={i++} className="profile-card">
                <h2 className="profile-card-title">{t('settings.about')}</h2>
                {paragraphs.map((p, idx) => (
                  <p key={idx} className="profile-text">
                    {p}
                  </p>
                ))}
              </Rise>
            )}

            {!locked && facts.length > 0 && (
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

            {escort.services?.length > 0 && (
              <Rise i={i++} className="profile-card">
                <h2 className="profile-card-title">{t('editor.services')}</h2>
                <div className="tags">
                  {escort.services.map((s) => (
                    <span className="tag" key={s}>
                      {serviceLabel(t, s)}
                    </span>
                  ))}
                </div>
              </Rise>
            )}

            {escort.rates?.length > 0 && (
              <Rise i={i++} className="profile-card">
                <h2 className="profile-card-title">{t('profile.rates')}</h2>
                <div className="rates">
                  {escort.rates.map((r, idx) => (
                    <div className="rate" key={idx}>
                      <span>{r.label}</span>
                      <b>{r.price}</b>
                    </div>
                  ))}
                </div>
              </Rise>
            )}

            {!locked && user && <ProfilePosts slug={escort.slug} own={own} name={escort.name} i={i++} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lightbox && current && (
          <Lightbox
            photos={photos}
            index={active}
            onIndex={setActive}
            onClose={() => setLightbox(false)}
            name={escort.name}
            t={t}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}

function ProfilePosts({ slug, own, name, i }) {
  const { t } = useI18n();
  const feed = usePosts(`/api/escorts/${encodeURIComponent(slug)}/posts`);
  if (!own && feed.posts && !feed.posts.length) return null;
  return (
    <Rise i={i} className="profile-posts">
      <div className="section-title">
        <FeedIcon width={18} height={18} />
        {t('feed.profileTitle')}
      </div>
      {own && <Composer onPosted={feed.prepend} />}
      <PostList feed={feed} empty={t('feed.emptyOwn', { name })} />
    </Rise>
  );
}
