import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Schweizer Orte (PLZ, Ort, Kanton, Koordinaten) aus GeoNames (CC BY 4.0, www.geonames.org).
// Liegt lokal vor – es werden keine externen Dienste abgefragt.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'ch-places.json'), 'utf8'));

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const places = raw.map(([zip, name, canton, lat, lng]) => ({ zip, name, canton, lat, lng, key: norm(name) }));

const out = (p) => p && { zip: p.zip, name: p.name, canton: p.canton, lat: p.lat, lng: p.lng };

export function searchPlaces(q, limit = 12) {
  const query = norm(q);
  if (!query) return [];
  if (/^\d+$/.test(query)) {
    return places.filter((p) => p.zip.startsWith(query)).slice(0, limit).map(out);
  }
  // pro Ort/Kanton nur einen Eintrag (kleinste PLZ), Treffer am Wortanfang zuerst
  const best = new Map();
  for (const p of places) {
    const pos = p.key.indexOf(query);
    if (pos < 0) continue;
    const rank = p.key === query ? 0 : pos === 0 ? 1 : p.key.includes(` ${query}`) ? 2 : 3;
    const k = `${p.key}|${p.canton}`;
    const prev = best.get(k);
    if (!prev || rank < prev.rank || (rank === prev.rank && p.zip < prev.p.zip)) best.set(k, { p, rank });
  }
  return [...best.values()]
    .sort((a, b) => a.rank - b.rank || a.p.key.length - b.p.key.length || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((x) => out(x.p));
}

export function findPlace(zip, name) {
  const z = String(zip || '').trim();
  const n = norm(name);
  if (z) {
    const byZip = places.filter((p) => p.zip === z);
    return out(byZip.find((p) => p.key === n) || byZip[0]) || null;
  }
  if (n) return out(places.find((p) => p.key === n)) || null;
  return null;
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function nearestPlace(lat, lng) {
  let best = null;
  let bestD = Infinity;
  for (const p of places) {
    const d = distanceKm(lat, lng, p.lat, p.lng);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best ? { ...out(best), distance: Math.round(bestD * 10) / 10 } : null;
}
