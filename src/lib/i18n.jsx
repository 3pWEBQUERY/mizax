import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import de from '../locales/de.js';

// Deutsch ist immer geladen (Rückfall für fehlende Texte); die übrigen Sprachen werden erst
// geladen, wenn sie gebraucht werden – das hält das Startpaket klein.
const loaders = {
  en: () => import('../locales/en.js'),
  fr: () => import('../locales/fr.js'),
  es: () => import('../locales/es.js'),
  hu: () => import('../locales/hu.js'),
  pl: () => import('../locales/pl.js'),
  ro: () => import('../locales/ro.js'),
};

export const LOCALES = ['de', 'en', 'fr', 'es', 'hu', 'pl', 'ro'];
export const LANG_NAMES = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  hu: 'Magyar',
  pl: 'Polski',
  ro: 'Română',
};
export const dictionaries = { de };
const KEY = 'mizax.locale';

export async function loadLocale(l) {
  if (!dictionaries[l] && loaders[l]) dictionaries[l] = (await loaders[l]()).default;
  return dictionaries[l];
}

export function detectLocale() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && LOCALES.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  for (const l of navigator.languages || [navigator.language || 'de']) {
    const code = String(l).slice(0, 2).toLowerCase();
    if (LOCALES.includes(code)) return code;
  }
  return 'de';
}

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
}

const I18nCtx = createContext(null);

export function I18nProvider({ children }) {
  // main.jsx lädt die erkannte Sprache vor dem ersten Rendern
  const [locale, setLocaleState] = useState(() => {
    const l = detectLocale();
    return dictionaries[l] ? l : 'de';
  });

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l) => {
    if (!LOCALES.includes(l)) return;
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
    loadLocale(l)
      .then(() => setLocaleState(l))
      .catch(() => {});
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
