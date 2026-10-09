import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import de from '../locales/de.js';
import en from '../locales/en.js';
import fr from '../locales/fr.js';
import es from '../locales/es.js';
import hu from '../locales/hu.js';
import pl from '../locales/pl.js';
import ro from '../locales/ro.js';

export const dictionaries = { de, en, fr, es, hu, pl, ro };
export const LOCALES = Object.keys(dictionaries);
const KEY = 'mizax.locale';

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && dictionaries[saved]) return saved;
  } catch {
    /* ignore */
  }
  for (const l of navigator.languages || [navigator.language || 'de']) {
    const code = String(l).slice(0, 2).toLowerCase();
    if (dictionaries[code]) return code;
  }
  return 'de';
}

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
}

const I18nCtx = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(detect);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l) => {
    if (!dictionaries[l]) return;
    setLocaleState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      let s = lookup(dictionaries[locale], key) ?? lookup(de, key) ?? key;
      if (vars && typeof s === 'string') {
        s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
      }
      return s;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}

export function useT() {
  return useContext(I18nCtx).t;
}

// Fehler vom Server in die aktuelle Sprache übersetzen
export function errorText(t, err) {
  const key = `errors.${err?.code || (err?.status ? 'server_error' : 'network')}`;
  const s = t(key);
  return s === key ? err?.message || t('errors.server_error') : s;
}
