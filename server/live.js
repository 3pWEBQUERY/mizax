// Echtzeit-Ereignisse per Server-Sent Events (neue Nachrichten, gelesen, tippt gerade).
// Die Verbindungen liegen im Arbeitsspeicher – das reicht, solange Railway eine Instanz betreibt;
// die App fragt zusätzlich in grösseren Abständen nach, falls ein Ereignis verloren geht.

const clients = new Map(); // userId → Set<res>

export function subscribe(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
  return () => {
    const set = clients.get(userId);
    if (!set) return;
    set.delete(res);
    if (!set.size) clients.delete(userId);
  };
}

export function publish(userIds, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const id of new Set(userIds)) {
    for (const res of clients.get(id) || []) res.write(payload);
  }
}
