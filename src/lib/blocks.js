import { useEffect, useSyncExternalStore } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

// Blockierte Personen des angemeldeten Kontos (für Profile, Chat und Einstellungen)
let state = { userId: null, list: null };
let pending = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const set = (userId, list) => {
  state = { userId, list };
  emit();
};

function load(userId) {
  if (!pending) {
    pending = api('/api/me/blocks')
      .then((list) => set(userId, list))
      .catch(() => set(userId, []))
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function useBlocks() {
  const { user } = useAuth();
  const snap = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
  const userId = user?.id || null;
  useEffect(() => {
    if (userId && snap.userId !== userId) load(userId);
  }, [userId, snap.userId]);
  const list = snap.userId === userId ? snap.list || [] : [];
  return { list, ids: new Set(list.map((b) => b.id)), loaded: snap.userId === userId && snap.list !== null };
}

export async function block(userId, me) {
  set(me, await api(`/api/blocks/${userId}`, { method: 'PUT' }));
}

export async function unblock(userId, me) {
  set(me, await api(`/api/blocks/${userId}`, { method: 'DELETE' }));
}
