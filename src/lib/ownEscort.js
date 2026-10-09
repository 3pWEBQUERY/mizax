import { useEffect, useSyncExternalStore } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

// Eigenes Escort-Profil (auch unveröffentlicht) für Composer, Seitenleiste und Einstellungen
let state = { userId: null, escort: null };
let pending = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function setOwnEscort(userId, escort) {
  state = { userId, escort: escort || null };
  emit();
}

function load(userId) {
  if (!pending) {
    pending = api('/api/me/profile')
      .then((e) => setOwnEscort(userId, e))
      .catch(() => setOwnEscort(userId, null))
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function useOwnEscort() {
  const { user } = useAuth();
  const snap = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
  const escortUserId = user?.role === 'escort' ? user.id : null;
  useEffect(() => {
    if (escortUserId && snap.userId !== escortUserId) load(escortUserId);
  }, [escortUserId, snap.userId]);
  return escortUserId && snap.userId === escortUserId ? snap.escort : null;
}
