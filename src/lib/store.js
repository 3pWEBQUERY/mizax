import { useEffect, useState, useSyncExternalStore } from 'react';
import { api } from './api.js';

// ---------- Profil-Cache: sofortige Seitenwechsel ohne Ladezustand ----------

const bySlug = new Map();
let list = null;
let listPromise = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadEscorts(force = false) {
  if (listPromise && !force) return listPromise;
  listPromise = api('/api/escorts')
    .then((rows) => {
      list = rows;
      rows.forEach((e) => bySlug.set(e.slug, e));
      emit();
      return rows;
    })
    .catch((err) => {
      listPromise = null;
      throw err;
    });
  return listPromise;
}

export function useEscorts() {
  const data = useSyncExternalStore(subscribe, () => list);
  const [error, setError] = useState(null);
  useEffect(() => {
    loadEscorts().catch(setError);
  }, []);
  return { escorts: data, error };
}

export function getCachedEscort(slug) {
  return bySlug.get(slug) || null;
}

const inflight = new Map();
export function prefetchEscort(slug) {
  if (inflight.has(slug)) return inflight.get(slug);
  const p = api(`/api/escorts/${encodeURIComponent(slug)}`)
    .then((e) => {
      bySlug.set(slug, e);
      emit();
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

// ---------- Favoriten (lokal im Browser) ----------

const FAV_KEY = 'mizax.favorites';
let favs = (() => {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
  } catch {
    return new Set();
  }
})();
const favListeners = new Set();

export function toggleFavorite(slug) {
  favs = new Set(favs);
  if (favs.has(slug)) favs.delete(slug);
  else favs.add(slug);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  } catch {
    /* ignore */
  }
  favListeners.forEach((l) => l());
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
