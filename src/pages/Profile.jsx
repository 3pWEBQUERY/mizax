import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { Photo } from '../components/Media.jsx';
import { CheckIcon, ChatIcon, PhoneIcon, MailIcon, HeartIcon, CloseIcon, ChevronL, ChevronR, LockIcon, WhatsAppIcon } from '../components/Icons.jsx';
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

  useDock(
    escort
      ? {
          mode: 'message',
          locked: !user,
          escort: {
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
            {paragraphs.map((p, idx) => (
              <Bubble key={idx} i={i++}>
                {p}
              </Bubble>
            ))}

            {!locked && facts.length > 0 && (
              <Bubble i={i++} style={{ width: '100%' }}>
                <dl className="facts" style={{ margin: 0 }}>
                  {facts.map(([k, v]) => (
                    <div className="fact" key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </Bubble>
            )}

            {escort.services?.length > 0 && (
              <Bubble i={i++} style={{ width: '100%' }}>
                <div className="bubble-label">{t('editor.services')}</div>
                <div className="tags">
                  {escort.services.map((s) => (
                    <span className="tag" key={s}>
                      {serviceLabel(t, s)}
                    </span>
                  ))}
                </div>
              </Bubble>
            )}

            {escort.rates?.length > 0 && (
              <Bubble i={i++} style={{ width: '100%' }}>
                <div className="bubble-label">{t('profile.rates')}</div>
                <div className="rates">
                  {escort.rates.map((r, idx) => (
                    <div className="rate" key={idx}>
                      <span>{r.label}</span>
                      <b>{r.price}</b>
                    </div>
                  ))}
                </div>
              </Bubble>
            )}

            {!locked && (
            <Rise i={i++} className="actions">
              <button
                type="button"
                className={`white-btn ${messageOpen ? 'pressed' : ''}`}
                data-message-toggle
                aria-expanded={messageOpen}
                onClick={() => setMessageOpen(!messageOpen)}
              >
                <ChatIcon /> {t('profile.write')}
              </button>
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
                className="ghost-btn"
                onClick={() => toggleFavorite(escort.slug).catch(() => {})}
                aria-pressed={isFav}
                style={isFav ? { color: '#ff5c8a' } : undefined}
              >
                <HeartIcon filled={isFav} width={20} height={20} />
                {isFav ? t('profile.saved') : t('profile.save')}
              </button>
            </Rise>
            )}
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

function Lightbox({ photos, index, onIndex, onClose, name, t }) {
  const go = useCallback(
    (d) => onIndex((index + d + photos.length) % photos.length),
    [index, onIndex, photos.length],
  );
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);
  const p = photos[index];

  return (
    <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="lightbox-bg" onClick={onClose} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={p.id}
          className="lightbox-img"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <img src={p.url} alt={name} />
        </motion.div>
      </AnimatePresence>
      <button type="button" className="icon-btn" style={{ position: 'absolute', top: 18, right: 20 }} onClick={onClose} aria-label={t('profile.close')}>
        <CloseIcon />
      </button>
      {photos.length > 1 && (
        <>
          <button type="button" className="icon-btn lightbox-nav" style={{ left: 20 }} onClick={() => go(-1)} aria-label={t('profile.prev')}>
            <ChevronL />
          </button>
          <button type="button" className="icon-btn lightbox-nav" style={{ right: 20 }} onClick={() => go(1)} aria-label={t('profile.next')}>
            <ChevronR />
          </button>
        </>
      )}
    </motion.div>
  );
}
