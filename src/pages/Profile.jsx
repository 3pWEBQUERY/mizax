import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import { Bubble, Rise } from '../components/Bubble.jsx';
import { Photo } from '../components/Media.jsx';
import { CheckIcon, ChatIcon, PhoneIcon, MailIcon, HeartIcon, CloseIcon, ChevronL, ChevronR } from '../components/Icons.jsx';
import { useEscort, useFavorites, toggleFavorite, preloadImage } from '../lib/store.js';
import { useDock, useDockState } from '../lib/dock.jsx';
import { contactLinks } from '../lib/contact.js';
import { layoutTransition } from '../lib/motion.js';

const kindIcon = { whatsapp: ChatIcon, call: PhoneIcon, mail: MailIcon, sms: ChatIcon };

export default function Profile() {
  const { slug } = useParams();
  const { escort, error } = useEscort(slug);
  const favs = useFavorites();
  const { inputRef } = useDockState();
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useDock(
    escort
      ? {
          mode: 'message',
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
            <Bubble i={0}>Dieses Profil ist leider nicht mehr verfügbar.</Bubble>
            <Rise i={1}>
              <Link to="/" className="white-btn">
                Zurück zur Übersicht
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
  const links = contactLinks(escort).filter((l) => l.kind !== 'sms');
  const paragraphs = (escort.bio || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const facts = [
    ['Alter', `${escort.age} Jahre`],
    ['Größe', escort.height ? `${escort.height} cm` : null],
    ['Herkunft', escort.nationality],
    ['Stadt', escort.city],
    ['Sprachen', escort.languages?.join(', ')],
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
            {current && <button type="button" aria-label="Foto vergrößern" onClick={() => setLightbox(true)} />}
          </motion.div>

          {photos.length > 1 && (
            <Rise i={1} className="thumbs">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  className={`thumb ${idx === active ? 'active' : ''}`}
                  onClick={() => setActive(idx)}
                  aria-label={`Foto ${idx + 1}`}
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
                  <CheckIcon /> Verifiziert
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className={`dot ${escort.available ? '' : 'off'}`} />
                {escort.available ? 'Verfügbar' : 'Derzeit nicht verfügbar'}
              </span>
            </Rise>
            <Rise i={i++} as="h1" className="profile-title">
              {escort.name}, <span className="age">{escort.age}</span>
            </Rise>
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

            {facts.length > 0 && (
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
                <div className="bubble-label">Ich begleite dich gerne zu</div>
                <div className="tags">
                  {escort.services.map((s) => (
                    <span className="tag" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
              </Bubble>
            )}

            {escort.rates?.length > 0 && (
              <Bubble i={i++} style={{ width: '100%' }}>
                <div className="bubble-label">Honorar</div>
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

            <Rise i={i++} className="actions">
              {links.length ? (
                links.map((l, idx) => {
                  const Icon = kindIcon[l.kind];
                  return (
                    <a
                      key={l.kind}
                      href={l.href}
                      className={idx === 0 ? 'white-btn' : 'ghost-btn'}
                      target={l.kind === 'whatsapp' ? '_blank' : undefined}
                      rel="noreferrer"
                    >
                      <Icon /> {l.label}
                    </a>
                  );
                })
              ) : (
                <button type="button" className="white-btn" onClick={() => inputRef.current?.focus()}>
                  <ChatIcon /> Nachricht schreiben
                </button>
              )}
              <button
                type="button"
                className="ghost-btn"
                onClick={() => toggleFavorite(escort.slug)}
                aria-pressed={isFav}
                style={isFav ? { color: '#ff5c8a' } : undefined}
              >
                <HeartIcon filled={isFav} width={20} height={20} />
                {isFav ? 'Gemerkt' : 'Merken'}
              </button>
            </Rise>
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
          />
        )}
      </AnimatePresence>
    </Page>
  );
}

function Lightbox({ photos, index, onIndex, onClose, name }) {
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
      <button type="button" className="icon-btn" style={{ position: 'absolute', top: 18, right: 20 }} onClick={onClose} aria-label="Schließen">
        <CloseIcon />
      </button>
      {photos.length > 1 && (
        <>
          <button type="button" className="icon-btn lightbox-nav" style={{ left: 20 }} onClick={() => go(-1)} aria-label="Vorheriges Foto">
            <ChevronL />
          </button>
          <button type="button" className="icon-btn lightbox-nav" style={{ right: 20 }} onClick={() => go(1)} aria-label="Nächstes Foto">
            <ChevronR />
          </button>
        </>
      )}
    </motion.div>
  );
}
