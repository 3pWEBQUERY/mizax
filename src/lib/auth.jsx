import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { loadFavorites, resetEscorts } from './store.js';
import { useI18n } from './i18n.jsx';
import { startInbox } from './inbox.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    api('/api/auth/me')
      .then(({ user }) => {
        setUser(user);
        loadFavorites(Boolean(user));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const applyUser = useCallback((u) => {
    setUser(u);
    resetEscorts().catch(() => {});
    loadFavorites(Boolean(u));
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { user } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      applyUser(user);
      if (user.locale) setLocale(user.locale);
      return user;
    },
    [applyUser, setLocale],
  );

  const register = useCallback(
    async (data) => {
      const { user } = await api('/api/auth/register', { method: 'POST', body: { ...data, locale } });
      applyUser(user);
      return user;
    },
    [applyUser, locale],
  );

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    applyUser(null);
  }, [applyUser]);

  const userId = user?.id;
  useEffect(() => {
    if (ready) startInbox(Boolean(userId));
  }, [ready, userId]);

  // Sprachwahl im Konto merken
  useEffect(() => {
    if (user && user.locale !== locale) {
      api('/api/auth/locale', { method: 'PUT', body: { locale } }).catch(() => {});
      setUser((u) => (u ? { ...u, locale } : u));
    }
  }, [locale, user]);

  // nach Änderungen in den Einstellungen bzw. nach dem Löschen des Kontos
  const updateUser = useCallback((u) => setUser((prev) => (u && prev ? { ...prev, ...u } : u)), []);
  const clearUser = useCallback(() => applyUser(null), [applyUser]);

  const value = useMemo(
    () => ({ user, ready, login, register, logout, updateUser, clearUser }),
    [user, ready, login, register, logout, updateUser, clearUser],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
