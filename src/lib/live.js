// Echtzeit-Ereignisse vom Server (Server-Sent Events): neue Nachrichten, gelesen, tippt gerade.
// Eine Verbindung pro Tab, nur solange jemand angemeldet ist; der Browser verbindet sich
// nach Abbrüchen selbst neu.

let source = null;
const listeners = new Map(); // Ereignis → Set<fn>
const EVENTS = ['message', 'read', 'typing'];

export function startLive(loggedIn) {
  if (source) {
    source.close();
    source = null;
  }
  if (!loggedIn || typeof EventSource === 'undefined') return;
  source = new EventSource('/api/live');
  for (const type of EVENTS) {
    source.addEventListener(type, (e) => {
      let data = null;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      (listeners.get(type) || []).forEach((fn) => fn(data));
    });
  }
}

export const isLive = () => source?.readyState === 1;

export function onLive(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type).delete(fn);
}
