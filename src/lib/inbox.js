import { useSyncExternalStore } from 'react';
import { api } from './api.js';

// Anzahl ungelesener Nachrichten – wird regelmäßig im Hintergrund aktualisiert
let unread = 0;
let timer = null;
let active = false;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export async function refreshUnread() {
  if (!active) return;
  try {
    const { count } = await api('/api/messages/unread');
    if (count !== unread) {
      unread = count;
      emit();
    }
  } catch {
    /* offline */
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') refreshUnread();
}

export function startInbox(loggedIn) {
  window.clearInterval(timer);
  document.removeEventListener('visibilitychange', onVisible);
  active = loggedIn;
  if (!loggedIn) {
    unread = 0;
    emit();
    return;
  }
  refreshUnread();
  timer = window.setInterval(() => document.visibilityState === 'visible' && refreshUnread(), 20000);
  document.addEventListener('visibilitychange', onVisible);
}

export function useUnread() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => unread,
  );
}
