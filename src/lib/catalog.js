// Stammdaten für den Profil-Editor. Länder- und Sprachnamen kommen über Intl.DisplayNames
// automatisch in der jeweiligen Oberflächensprache, gespeichert werden nur die Codes.

export const COUNTRY_CODES = (
  'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL ' +
  'CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW ' +
  'GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT ' +
  'LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG ' +
  'PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL ' +
  'TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW'
).split(' ');

export const LANGUAGE_CODES = (
  'de en fr es it pt nl pl cs sk hu ro bg hr sr sl bs sq mk el tr ru uk be lt lv et fi sv nb da is ga mt ' +
  'ar he fa hi ur bn pa zh ja ko th vi id ms tl sw am af ka hy az kk uz mn ne ta'
).split(' ');

export const LEVELS = ['native', 'fluent', 'good', 'basic'];

export const SERVICE_GROUPS = [
  { key: 'companion', items: ['dinner_date', 'events', 'travel', 'overnight', 'weekend', 'gfe'] },
  { key: 'tender', items: ['kissing', 'french_kissing', 'cuddling', 'shower', 'striptease', 'lingerie'] },
  { key: 'massage', items: ['erotic_massage', 'body_to_body', 'tantra', 'handjob'] },
  { key: 'oral', items: ['oral_condom', 'oral_without', 'cunnilingus', 'sixty_nine'] },
  { key: 'intercourse', items: ['intercourse', 'multiple', 'positions', 'anal'] },
  { key: 'extras', items: ['roleplay', 'toys', 'dominant', 'submissive', 'fetish', 'duo', 'couples'] },
];

const cache = new Map();
function displayNames(locale, type) {
  const key = `${locale}:${type}`;
  if (!cache.has(key)) {
    try {
      cache.set(key, new Intl.DisplayNames([locale, 'en'], { type }));
    } catch {
      cache.set(key, null);
    }
  }
  return cache.get(key);
}

export function flag(code) {
  if (!/^[A-Z]{2}$/.test(code || '') || code === 'XK') return '🏳️';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function countryName(code, locale) {
  if (!/^[A-Z]{2}$/.test(code || '')) return code || '';
  if (code === 'XK') return displayNames(locale, 'region')?.of('XK') || 'Kosovo';
  return displayNames(locale, 'region')?.of(code) || code;
}

export function languageName(code, locale) {
  const name = displayNames(locale, 'language')?.of(code) || code;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// "de:native" -> { code: 'de', level: 'native' }; Altdaten (Freitext) -> { raw }
export function parseLanguage(entry) {
  const m = /^([a-z]{2,3}):(native|fluent|good|basic)$/.exec(entry || '');
  return m ? { code: m[1], level: m[2] } : { raw: entry };
}

export function sortedOptions(codes, nameOf) {
  return codes.map((code) => ({ code, name: nameOf(code) })).sort((a, b) => a.name.localeCompare(b.name));
}

export function serviceLabel(t, key) {
  const path = `services.items.${key}`;
  const label = t(path);
  return label === path ? key : label;
}
