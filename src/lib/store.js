import { useEffect, useState, useSyncExternalStore } from 'react';
import { api } from './api.js';

// ---------- Profil-Cache: sofortige Seitenwechsel ohne Ladezustand ----------

let bySlug = new Map();
let list = null;
let listPromise = null;
let generation = 0;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadEscorts(force = false) {
  if (listPromise && !force) return listPromise;
  const gen = generation;
  listPromise = api('/api/escorts')
    .then((rows) => {
      if (gen !== generation) return rows;
      list = rows;
      rows.forEach((e) => {
        const prev = bySlug.get(e.slug);
        // ein bereits geladenes Vollprofil nicht durch Kartendaten ersetzen
        if (!prev || e.full || !prev.full) bySlug.set(e.slug, e);
      });
      emit();
      return rows;
    })
    .catch((err) => {
      listPromise = null;
      throw err;
    });
  return listPromise;
}

// Nach Login/Logout: alles verwerfen, weil sich die sichtbaren Daten ändern
export function resetEscorts() {
  generation++;
  bySlug = new Map();
  inflight.clear();
  listPromise = null;
  return loadEscorts(true);
}

export function useEscorts() {
  const data = useSyncExternalStore(subscribe, () => list);
  const [error, setError] = useState(null);
  useEffect(() => {
    loadEscorts().catch(setError);
  }, []);
  return { escorts: data, error };
}

const inflight = new Map();
export function prefetchEscort(slug) {
  if (inflight.has(slug)) return inflight.get(slug);
  const gen = generation;
  const p = api(`/api/escorts/${encodeURIComponent(slug)}`)
    .then((e) => {
      if (gen === generation) {
        bySlug.set(slug, e);
        emit();
      }
      return e;
    })
    .finally(() => setTimeout(() => inflight.delete(slug), 30000));
  inflight.set(slug, p);
  return p;
}

export function useEscort(slug) {
  const escort = useSyncExternalStore(subscribe, () => bySlug.get(slug) || null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setError(null);
    prefetchEscort(slug).catch(setError);
  }, [slug]);
  return { escort, error };
}

export function preloadImage(src) {
  if (!src) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
}

// ---------- Favoriten (serverseitig pro Konto) ----------

let favs = new Set();
const favListeners = new Set();
const favEmit = () => favListeners.forEach((l) => l());

export async function loadFavorites(loggedIn) {
  if (!loggedIn) {
    favs = new Set();
    favEmit();
    return;
  }
  try {
    favs = new Set(await api('/api/me/favorites'));
  } catch {
    favs = new Set();
  }
  favEmit();
}

export async function toggleFavorite(slug) {
  const had = favs.has(slug);
  favs = new Set(favs);
  if (had) favs.delete(slug);
  else favs.add(slug);
  favEmit();
  try {
    await api(`/api/me/favorites/${encodeURIComponent(slug)}`, { method: had ? 'DELETE' : 'PUT' });
  } catch (err) {
    favs = new Set(favs);
    if (had) favs.add(slug);
    else favs.delete(slug);
    favEmit();
    throw err;
  }
}

export function useFavorites() {
  return useSyncExternalStore(
    (fn) => {
      favListeners.add(fn);
      return () => favListeners.delete(fn);
    },
    () => favs,
  );
}
