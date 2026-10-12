import { query } from './db.js';
import { findPlace, distanceKm } from './places.js';
import { escortOut, loadPhotos, RATING_COLS } from './escorts.js';

// Vorschläge für Mitglieder: neue Escorts, wiederkehrende Escorts und Escorts, die ihren Standort
// in den gewählten Umkreis verlegt haben – sortiert nach Übereinstimmung mit den Vorlieben.

export const RADII = [10, 25, 50, 100];
const WINDOW_DAYS = 30;
const MAX_MATCHES = 12;
const MAX_PREF_SERVICES = 40;

export function prefsOut(p, member) {
  return {
    enabled: Boolean(p?.enabled),
    city: p ? p.city : member?.city || '',
    zip: p ? p.zip : member?.zip || '',
    canton: p ? p.canton : member?.canton || '',
    radius: p ? p.radius : 25,
    services: p?.services || [],
    ageMin: p?.age_min ?? null,
    ageMax: p?.age_max ?? null,
  };
}

const age = (v) => {
  const n = Number(v);
  return v === '' || v == null || !Number.isInteger(n) ? null : Math.min(99, Math.max(18, n));
};

export function prefsInput(body) {
  const place = findPlace(body.zip, body.city);
  let [ageMin, ageMax] = [age(body.ageMin), age(body.ageMax)];
  if (ageMin && ageMax && ageMin > ageMax) [ageMin, ageMax] = [ageMax, ageMin];
  return {
    enabled: Boolean(body.enabled),
    city: place ? place.name : '',
    zip: place ? place.zip : '',
    canton: place ? place.canton : '',
    lat: place ? place.lat : null,
    lng: place ? place.lng : null,
    // ohne Standort gibt es keinen Umkreis: dann ganze Schweiz
    radius: place && RADII.includes(Number(body.radius)) ? Number(body.radius) : null,
    services: [...new Set((Array.isArray(body.services) ? body.services : []).map((s) => String(s).slice(0, 60)))]
      .filter(Boolean)
      .slice(0, MAX_PREF_SERVICES),
    ageMin,
    ageMax,
  };
}

export async function getPrefs(userId) {
  const { rows } = await query('SELECT * FROM member_prefs WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

export async function savePrefs(userId, d) {
  const { rows } = await query(
    `INSERT INTO member_prefs (user_id, enabled, city, zip, canton, lat, lng, radius, services, age_min, age_max)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled, city = EXCLUDED.city, zip = EXCLUDED.zip,
       canton = EXCLUDED.canton, lat = EXCLUDED.lat, lng = EXCLUDED.lng, radius = EXCLUDED.radius,
       services = EXCLUDED.services, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, updated_at = now()
     RETURNING *`,
    [userId, d.enabled, d.city, d.zip, d.canton, d.lat, d.lng, d.radius, d.services, d.ageMin, d.ageMax],
  );
  return rows[0];
}

// Kandidaten im Umkreis und Altersbereich, mit Übereinstimmung der Vorlieben
async function candidates(prefs) {
  const { rows } = await query(`SELECT *, ${RATING_COLS} FROM escorts WHERE published = true`);
  const wanted = new Set(prefs.services);
  const out = [];
  for (const r of rows) {
    if (prefs.age_min && r.age < prefs.age_min) continue;
    if (prefs.age_max && r.age > prefs.age_max) continue;
    let distance = null;
    if (prefs.lat != null && r.lat != null) distance = distanceKm(prefs.lat, prefs.lng, r.lat, r.lng);
    if (prefs.radius && (distance == null || distance > prefs.radius)) continue;
    const shared = (r.services || []).filter((k) => wanted.has(k)).length;
    out.push({ row: r, distance, shared });
  }
  return out;
}

const since = (d) => d && Date.now() - new Date(d) < WINDOW_DAYS * 24 * 3600 * 1000;

// jüngstes Ereignis im Zeitfenster: neu angemeldet, wieder aktiv oder Standort geändert
function latestEvent(r) {
  return [
    ['new', r.created_at],
    ['returning', r.returned_at],
    ['moved', r.moved_at],
  ]
    .filter(([, at]) => since(at))
    .sort((a, b) => new Date(b[1]) - new Date(a[1]))[0];
}

// Rangfolge: mehr gemeinsame Vorlieben zuerst, dann bessere Bewertung, dann näher
const byMatch = (a, b) =>
  b.shared - a.shared || (b.row.rating_avg || 0) - (a.row.rating_avg || 0) || (a.distance ?? 1e9) - (b.distance ?? 1e9);

export async function buildSuggestions(prefs) {
  const list = await candidates(prefs);
  const sections = { new: [], returning: [], moved: [], matches: [] };
  for (const c of list) {
    const ev = latestEvent(c.row);
    if (ev) sections[ev[0]].push({ ...c, event: ev[0], at: ev[1] });
    else if (!prefs.services.length || c.shared > 0) sections.matches.push({ ...c, event: 'match', at: null });
  }
  for (const items of Object.values(sections)) items.sort((a, b) => byMatch(a, b) || new Date(b.at) - new Date(a.at));
  sections.matches = sections.matches.slice(0, MAX_MATCHES);

  const ids = Object.values(sections).flatMap((items) => items.map((c) => c.row.id));
  const photos = await loadPhotos(ids);
  const total = prefs.services.length;
  const seen = new Date(prefs.seen_at);
  let unseen = 0;
  const out = {};
  for (const [key, items] of Object.entries(sections)) {
    out[key] = items.map((c) => {
      const fresh = Boolean(c.at) && new Date(c.at) > seen;
      if (fresh) unseen++;
      return {
        ...escortOut(c.row, photos.get(c.row.id) || []),
        distance: c.distance,
        suggestion: { event: c.event, at: c.at, shared: c.shared, total, fresh },
      };
    });
  }
  return { sections: out, unseen };
}

// Anzahl neuer Vorschläge seit dem letzten Besuch der Seite (für das Abzeichen im Menü)
export async function unseenCount(userId) {
  const prefs = await getPrefs(userId);
  if (!prefs?.enabled) return 0;
  const seen = new Date(prefs.seen_at);
  const list = await candidates(prefs);
  return list.filter((c) => {
    const ev = latestEvent(c.row);
    return ev && new Date(ev[1]) > seen;
  }).length;
}
