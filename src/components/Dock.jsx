import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDockState } from '../lib/dock.jsx';
import { useEscorts } from '../lib/store.js';
import { contactLinks } from '../lib/contact.js';
import { PlusIcon, MicIcon, SendIcon, CloseIcon } from './Icons.jsx';
import { useToast } from './Toast.jsx';

const SpeechRecognition =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const spring = { type: 'spring', stiffness: 380, damping: 32 };

export default function Dock() {
  const { config, query, setQuery, city, setCity, inputRef } = useDockState();
  const { escorts } = useEscorts();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const mode = config.mode;
  const escort = config.escort;

  useEffect(() => {
    setOpen(false);
    setMessage('');
  }, [mode, escort?.slug]);

  const cities = useMemo(() => {
    const m = new Map();
    (escorts || []).forEach((e) => e.city && m.set(e.city, (m.get(e.city) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [escorts]);

  const value = mode === 'message' ? message : query;
  const setValue = mode === 'message' ? setMessage : setQuery;

  const placeholder =
    mode === 'message'
      ? `Nachricht an ${escort?.name || ''}`
      : city
        ? `Suche in ${city}`
        : 'Suche nach Name oder Stadt';

  const note =
    mode === 'message'
      ? 'Diskret & direkt – deine Nachricht öffnet sich in WhatsApp, SMS oder E-Mail.'
      : 'Alle gezeigten Personen sind mindestens 18 Jahre alt.';

  function toggleMic() {
    if (!SpeechRecognition) {
      toast('Spracheingabe wird von diesem Browser nicht unterstützt');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'de-DE';
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
    const links = contactLinks(escort, message.trim());
    if (!links.length) {
      toast('Für dieses Profil sind noch keine Kontaktdaten hinterlegt');
      return;
    }
    if (links[0].kind === 'whatsapp') window.open(links[0].href, '_blank', 'noopener');
    else window.location.href = links[0].href;
    setMessage('');
  }

  if (mode === 'hidden') return null;

  const links = mode === 'message' && escort ? contactLinks(escort, message.trim()) : [];

  return (
    <div className="dock-wrap">
      <motion.form
        className="dock"
        onSubmit={(e) => {
          if (mode === 'message') send(e);
          else {
            e.preventDefault();
            inputRef.current?.blur();
          }
        }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.15 }}
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
                  <div className="dock-pop-title">Kontakt aufnehmen</div>
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
                    <div className="dock-pop-title">Noch keine Kontaktdaten hinterlegt.</div>
                  )}
                </>
              ) : (
                <>
                  <div className="dock-pop-title">Stadt wählen</div>
                  <CityChip label="Alle Städte" active={!city} onClick={() => { setCity(''); setOpen(false); }} />
                  {cities.map(([c, n]) => (
                    <CityChip
                      key={c}
                      label={c}
                      count={n}
                      active={city === c}
                      onClick={() => {
                        setCity(city === c ? '' : c);
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
            <button type="button" className="dock-btn" aria-label="Suche leeren" onClick={() => setQuery('')}>
              <CloseIcon width={18} height={18} />
            </button>
          )}
          <button
            type="button"
            className={`dock-btn ${open || (mode === 'search' && city) ? 'on' : ''}`}
            aria-label={mode === 'message' ? 'Kontaktoptionen' : 'Stadt filtern'}
            onClick={() => setOpen((o) => !o)}
          >
            <motion.span animate={{ rotate: open ? 45 : 0 }} transition={spring} style={{ display: 'grid' }}>
              <PlusIcon />
            </motion.span>
          </button>
          {mode === 'message' && message.trim() ? (
            <button type="submit" className="dock-btn send" aria-label="Senden">
              <SendIcon width={20} height={20} />
            </button>
          ) : (
            <button
              type="button"
              className={`dock-btn ${listening ? 'listening' : ''}`}
              aria-label="Spracheingabe"
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
    </div>
  );
}

function CityChip({ label, count, active, onClick }) {
  return (
    <button type="button" className={`chip ${active ? 'active' : ''}`} onClick={onClick}>
      {active && <motion.span layoutId="dock-city" className="chip-bg" transition={spring} />}
      <span>
        {label}
        {count ? <small>{count}</small> : null}
      </span>
    </button>
  );
}
