import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const DockCtx = createContext(null);

export function DockProvider({ children }) {
  const [config, setConfig] = useState({ mode: 'search' });
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const inputRef = useRef(null);
  const value = useMemo(
    () => ({ config, setConfig, query, setQuery, city, setCity, inputRef }),
    [config, query, city],
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
