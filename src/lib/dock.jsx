import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const DockCtx = createContext(null);

export function DockProvider({ children }) {
  const [config, setConfig] = useState({ mode: 'search' });
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  // Suchleiste ist standardmäßig versteckt und erscheint erst über den Suchen-Button
  const [searchOpen, setSearchOpen] = useState(false);
  // Nachrichtenleiste auf Profilen erscheint erst über „Nachricht schreiben“
  const [messageOpen, setMessageOpen] = useState(false);
  const inputRef = useRef(null);
  const value = useMemo(
    () => ({
      config,
      setConfig,
      query,
      setQuery,
      city,
      setCity,
      inputRef,
      searchOpen,
      setSearchOpen,
      messageOpen,
      setMessageOpen,
    }),
    [config, query, city, searchOpen, messageOpen],
  );
  return <DockCtx.Provider value={value}>{children}</DockCtx.Provider>;
}

export function useDockState() {
  return useContext(DockCtx);
}

// Seiten melden hier, wie die untere Eingabeleiste aussehen soll.
export function useDock(config) {
  const { setConfig } = useContext(DockCtx);
  const key = JSON.stringify(config);
  useEffect(() => {
    setConfig(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
