// Alle 26 Schweizer Kantone (Kürzel + Namen). Für Sprachen ohne eigene Schreibweise
// wird die englische Bezeichnung verwendet.
export const CANTONS = [
  ['AG', 'Aargau', 'Argovie', 'Aargau'],
  ['AI', 'Appenzell Innerrhoden', 'Appenzell Rhodes-Intérieures', 'Appenzell Innerrhoden'],
  ['AR', 'Appenzell Ausserrhoden', 'Appenzell Rhodes-Extérieures', 'Appenzell Ausserrhoden'],
  ['BE', 'Bern', 'Berne', 'Bern'],
  ['BL', 'Basel-Landschaft', 'Bâle-Campagne', 'Basel-Landschaft'],
  ['BS', 'Basel-Stadt', 'Bâle-Ville', 'Basel-Stadt'],
  ['FR', 'Freiburg', 'Fribourg', 'Fribourg'],
  ['GE', 'Genf', 'Genève', 'Geneva'],
  ['GL', 'Glarus', 'Glaris', 'Glarus'],
  ['GR', 'Graubünden', 'Grisons', 'Graubünden'],
  ['JU', 'Jura', 'Jura', 'Jura'],
  ['LU', 'Luzern', 'Lucerne', 'Lucerne'],
  ['NE', 'Neuenburg', 'Neuchâtel', 'Neuchâtel'],
  ['NW', 'Nidwalden', 'Nidwald', 'Nidwalden'],
  ['OW', 'Obwalden', 'Obwald', 'Obwalden'],
  ['SG', 'St. Gallen', 'Saint-Gall', 'St. Gallen'],
  ['SH', 'Schaffhausen', 'Schaffhouse', 'Schaffhausen'],
  ['SO', 'Solothurn', 'Soleure', 'Solothurn'],
  ['SZ', 'Schwyz', 'Schwytz', 'Schwyz'],
  ['TG', 'Thurgau', 'Thurgovie', 'Thurgau'],
  ['TI', 'Tessin', 'Tessin', 'Ticino'],
  ['UR', 'Uri', 'Uri', 'Uri'],
  ['VD', 'Waadt', 'Vaud', 'Vaud'],
  ['VS', 'Wallis', 'Valais', 'Valais'],
  ['ZG', 'Zug', 'Zoug', 'Zug'],
  ['ZH', 'Zürich', 'Zurich', 'Zurich'],
].map(([code, de, fr, en]) => ({ code, de, fr, en }));

const byCode = new Map(CANTONS.map((c) => [c.code, c]));

export function cantonName(code, locale = 'de') {
  const c = byCode.get(code);
  if (!c) return code || '';
  return locale === 'de' ? c.de : locale === 'fr' ? c.fr : c.en;
}

export function distanceKm(aLat, aLng, bLat, bLng) {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Standort über den Browser – nur nach Klick, wird nicht gespeichert
export function locate() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(Object.assign(new Error('unavailable'), { code: 'unavailable' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(Object.assign(new Error(err.message), { code: err.code === 1 ? 'denied' : 'unavailable' })),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 },
    );
  });
}
