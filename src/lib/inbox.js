import { useSyncExternalStore } from 'react';
import { api } from './api.js';

// Anzahl ungelesener Nachrichten (und neuer Vorschläge für Mitglieder) – wird regelmäßig im
// Hintergrund aktualisiert
let unread = 0;
let suggestions = 0;
let timer = null;
let active = false;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export async function refreshUnread() {
  if (!active) return;
  try {
    const r = await api('/api/messages/unread');
    if (r.count !== unread || (r.suggestions || 0) !== suggestions) {
      unread = r.count;
      suggestions = r.suggestions || 0;
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
    suggestions = 0;
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

export function useSuggestionCount() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => suggestions,
  );
}
