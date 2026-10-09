import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDockState } from '../lib/dock.jsx';
import { useEscorts } from '../lib/store.js';
import { contactLinks } from '../lib/contact.js';
import { PlusIcon, MicIcon, SendIcon, CloseIcon } from './Icons.jsx';
import { useToast } from './Toast.jsx';
import { useT, useI18n } from '../lib/i18n.jsx';
import { CANTONS, cantonName } from '../lib/cantons.js';
import { useNavigate } from 'react-router-dom';

const SpeechRecognition =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const spring = { type: 'spring', stiffness: 380, damping: 32 };

const wrapVariants = {
  hidden: { opacity: 0, transition: { duration: 0.25 } },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

const formVariants = {
  hidden: {
    y: 36,
    opacity: 0,
    scale: 0.96,
    filter: 'blur(8px)',
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
  show: {
    y: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 380, damping: 30 },
  },
};

export default function Dock() {
  const {
    config,
    query,
    setQuery,
    canton,
    setCanton,
    inputRef,
    searchOpen,
    setSearchOpen,
    messageOpen,
    setMessageOpen,
  } = useDockState();
  const { locale } = useI18n();
  const formRef = useRef(null);
  const { escorts } = useEscorts();
  const toast = useToast();
  const t = useT();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const mode = config.mode;
  const escort = config.escort;
  const locked = Boolean(config.locked);

  useEffect(() => {
    setOpen(false);
    setMessage('');
    setMessageOpen(false);
  }, [mode, escort?.slug, setMessageOpen]);

  const searchVisible = mode === 'search' && searchOpen;
  const messageVisible = mode === 'message' && messageOpen && !locked;
  const panelVisible = searchVisible || messageVisible;

  // Such- bzw. Nachrichtenleiste: Fokus beim Öffnen, schließen bei Klick außerhalb oder Escape
  useEffect(() => {
    if (!panelVisible) {
      setOpen(false);
      return;
    }
    const close = () => {
      setSearchOpen(false);
      setMessageOpen(false);
    };
    const focusTimer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 120);
    const onDown = (e) => {
      if (formRef.current?.contains(e.target)) return;
      if (e.target.closest?.('[data-search-toggle], [data-message-toggle]')) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [panelVisible, inputRef, setSearchOpen, setMessageOpen]);

  // alle 26 Kantone mit Anzahl Profile, alphabetisch nach Name in der aktuellen Sprache
  const cantons = useMemo(() => {
    const m = new Map();
    (escorts || []).forEach((e) => e.canton && m.set(e.canton, (m.get(e.canton) || 0) + 1));
    return CANTONS.map((c) => [c.code, cantonName(c.code, locale), m.get(c.code) || 0]).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [escorts, locale]);

  const value = mode === 'message' ? message : query;
  const setValue = mode === 'message' ? setMessage : setQuery;

  const placeholder =
    mode === 'message'
      ? t('dock.messageTo', { name: escort?.name || '' })
      : canton
        ? t('dock.searchIn', { city: cantonName(canton, locale) })
        : t('dock.searchPlaceholder');

  const note =
    mode === 'message' ? (locked ? t('dock.noteLocked') : t('dock.noteMessage')) : t('dock.noteSearch');

  function toggleMic() {
    if (locked) {
      navigate('/login');
      return;
    }
    if (!SpeechRecognition) {
      toast(t('dock.voiceUnsupported'));
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = document.documentElement.lang || 'de';
    rec.interimResults = true;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      setValue(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  function send(e) {
    e?.preventDefault();
    if (mode !== 'message' || !escort) return;
    if (locked) {
      navigate('/login');
      return;
    }
    const links = contactLinks(escort, message.trim(), t);
    if (!links.length) {
      toast(t('dock.noContactToast'));
      return;
    }
    if (links[0].kind === 'whatsapp') window.open(links[0].href, '_blank', 'noopener');
    else window.location.href = links[0].href;
    setMessage('');
    setMessageOpen(false);
  }

  const visible = panelVisible;

  const links = mode === 'message' && escort && !locked ? contactLinks(escort, message.trim(), t) : [];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={mode}
          className="dock-wrap"
          variants={wrapVariants}
          initial="hidden"
          animate="show"
          exit="hidden"
        >
          <motion.form
            ref={formRef}
            className="dock"
            variants={formVariants}
            onSubmit={(e) => {
              if (mode === 'message') send(e);
              else {
                e.preventDefault();
                inputRef.current?.blur();
                setSearchOpen(false);
              }
            }}
          >
            <AnimatePresence>
              {open && (
                <motion.div
                  className="dock-pop"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={spring}
                >
                  {mode === 'message' ? (
                    <>
                      <div className="dock-pop-title">{t('dock.contact')}</div>
                      {links.length ? (
                        links.map((l) => (
                          <a
                            key={l.kind}
                            className="chip"
                            href={l.href}
                            target={l.kind === 'whatsapp' ? '_blank' : undefined}
                            rel="noreferrer"
                          >
                            <span>{l.label}</span>
                          </a>
                        ))
                      ) : (
                        <div className="dock-pop-title">
                          {locked ? t('dock.noteLocked') : t('dock.noContact')}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="dock-pop-title">{t('geo.chooseCanton')}</div>
                      <CityChip
                        label={t('geo.allCantons')}
                        active={!canton}
                        onClick={() => {
                          setCanton('');
                          setOpen(false);
                        }}
                      />
                      {cantons.map(([c, name, n]) => (
                        <CityChip
                          key={c}
                          label={name}
                          count={n}
                          muted={!n}
                          active={canton === c}
                          onClick={() => {
                            setCanton(canton === c ? '' : c);
                            setOpen(false);
                          }}
                        />
                      ))}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="dock-bar">
              <div className="dock-input-wrap">
                <input
                  ref={inputRef}
                  className="dock-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={() => {
                    if (locked) {
                      inputRef.current?.blur();
                      navigate('/login');
                    }
                  }}
                  readOnly={locked}
                  aria-label={placeholder}
                  enterKeyHint={mode === 'message' ? 'send' : 'search'}
                />
                <AnimatePresence initial={false}>
                  {!value && (
                    <motion.span
                      key={placeholder}
                      className="dock-placeholder"
                      initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {placeholder}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {mode === 'search' && value && (
                <button
                  type="button"
                  className="dock-btn"
                  aria-label={t('dock.clear')}
                  onClick={() => setQuery('')}
                >
                  <CloseIcon width={18} height={18} />
                </button>
              )}
              <button
                type="button"
                className={`dock-btn ${open || (mode === 'search' && canton) ? 'on' : ''}`}
                aria-label={mode === 'message' ? t('dock.contactOptions') : t('dock.filterCity')}
                onClick={() => setOpen((o) => !o)}
              >
                <motion.span
                  animate={{ rotate: open ? 45 : 0 }}
                  transition={spring}
                  style={{ display: 'grid' }}
                >
                  <PlusIcon />
                </motion.span>
              </button>
              {mode === 'message' && message.trim() ? (
                <button type="submit" className="dock-btn send" aria-label={t('dock.send')}>
                  <SendIcon width={20} height={20} />
                </button>
              ) : (
                <button
                  type="button"
                  className={`dock-btn ${listening ? 'listening' : ''}`}
                  aria-label={t('dock.voice')}
                  onClick={toggleMic}
                >
                  <MicIcon />
                </button>
              )}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={note}
                className="dock-note"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {note}
              </motion.div>
            </AnimatePresence>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CityChip({ label, count, active, muted, onClick }) {
  return (
    <button type="button" className={`chip ${active ? 'active' : ''} ${muted && !active ? 'muted' : ''}`} onClick={onClick}>
      {active && <motion.span layoutId="dock-city" className="chip-bg" transition={spring} />}
      <span>
        {label}
        {count ? <small>{count}</small> : null}
      </span>
    </button>
  );
}
