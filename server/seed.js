import { query } from './db.js';

const demo = [
  ['Valentina', 24, 'Berlin', 'Elegant, charmant und immer ein Lächeln.', '#8b5cf6', 168, 'IT'],
  ['Mia', 22, 'München', 'Sportlich, lebensfroh und spontan.', '#ec4899', 165, 'DE'],
  ['Sofia', 27, 'Hamburg', 'Kultivierte Begleitung für besondere Abende.', '#6366f1', 172, 'ES'],
  ['Elena', 25, 'Frankfurt', 'Business-Dinner, Events und mehr.', '#0ea5e9', 170, 'RU'],
  ['Lara', 23, 'Köln', 'Natürlich, warmherzig und neugierig.', '#f97316', 163, 'DE'],
  ['Amélie', 26, 'Düsseldorf', 'Französischer Charme trifft Stil.', '#14b8a6', 169, 'FR'],
  ['Nina', 29, 'Stuttgart', 'Reisebegleitung mit Klasse.', '#a855f7', 174, 'DE'],
  ['Isabella', 24, 'Berlin', 'Kunst, Kultur und gute Gespräche.', '#e11d48', 166, 'BR'],
  ['Clara', 28, 'München', 'Die perfekte Begleitung für Ihren Abend.', '#3b82f6', 171, 'AT'],
  ['Jasmin', 21, 'Hamburg', 'Jung, frech und voller Energie.', '#d946ef', 160, 'DE'],
  ['Victoria', 30, 'Frankfurt', 'Diskret, gebildet, international.', '#06b6d4', 175, 'GB'],
  ['Leonie', 25, 'Leipzig', 'Bodenständig mit einem Hauch Glamour.', '#84cc16', 167, 'DE'],
  ['Aurora', 26, 'Köln', 'Für Momente, die man nicht vergisst.', '#f59e0b', 168, 'SE'],
  ['Melina', 23, 'Düsseldorf', 'Fröhlich, offen und unkompliziert.', '#ef4444', 164, 'GR'],
  ['Zara', 27, 'Berlin', 'Modern, stilsicher und weltoffen.', '#8b5cf6', 173, 'NL'],
];

const services = [
  ['dinner_date', 'events', 'travel', 'overnight', 'kissing', 'cuddling', 'erotic_massage'],
  ['dinner_date', 'weekend', 'gfe', 'french_kissing', 'shower', 'striptease', 'lingerie'],
  ['events', 'dinner_date', 'travel', 'cuddling', 'body_to_body', 'roleplay'],
];

// Altdaten (Freitext aus früheren Versionen) auf Codes umstellen
const LEGACY_NATIONALITY = {
  Italienisch: 'IT', Deutsch: 'DE', Spanisch: 'ES', Russisch: 'RU', Französisch: 'FR', Österreichisch: 'AT',
  Brasilianisch: 'BR', Britisch: 'GB', Schwedisch: 'SE', Griechisch: 'GR', Niederländisch: 'NL',
  Schweizerisch: 'CH', Polnisch: 'PL', Ungarisch: 'HU', Rumänisch: 'RO', Tschechisch: 'CZ', Ukrainisch: 'UA',
};
const LEGACY_LANGUAGE = {
  Deutsch: 'de', Englisch: 'en', Französisch: 'fr', Spanisch: 'es', Italienisch: 'it', Russisch: 'ru',
  Portugiesisch: 'pt', Polnisch: 'pl', Ungarisch: 'hu', Rumänisch: 'ro', Niederländisch: 'nl', Schwedisch: 'sv',
  Griechisch: 'el', Tschechisch: 'cs', Ukrainisch: 'uk', Türkisch: 'tr',
};
const LEGACY_SERVICE = {
  'Dinner Date': 'dinner_date', 'Begleitung zu Events': 'events', 'Business-Events': 'events',
  'Theater & Oper': 'events', Reisebegleitung: 'travel', Overnight: 'overnight', Wochenende: 'weekend',
};

export async function normalizeLegacy() {
  const { rows } = await query('SELECT id, nationality, languages, services FROM escorts');
  for (const r of rows) {
    const nationality = LEGACY_NATIONALITY[r.nationality] || r.nationality;
    const languages = [
      ...new Set(
        r.languages.map((l) => (/^[a-z]{2,3}:[a-z]+$/.test(l) ? l : LEGACY_LANGUAGE[l] ? `${LEGACY_LANGUAGE[l]}:fluent` : l)),
      ),
    ];
    const services = [...new Set(r.services.map((x) => LEGACY_SERVICE[x] || x))];
    if (
      nationality !== r.nationality ||
      languages.join('|') !== r.languages.join('|') ||
      services.join('|') !== r.services.join('|')
    ) {
      await query('UPDATE escorts SET nationality = $1, languages = $2, services = $3 WHERE id = $4', [
        nationality,
        languages,
        services,
        r.id,
      ]);
    }
  }
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function seedIfEmpty() {
  if (process.env.SEED_DEMO === 'false') return;
  const { rows } = await query('SELECT count(*)::int AS n FROM escorts');
  if (rows[0].n > 0) return;

  for (let i = 0; i < demo.length; i++) {
    const [name, age, city, tagline, accent, height, nationality] = demo[i];
    const bio = [
      `Hey, ich bin ${name}.`,
      `Ich lebe in ${city} und begleite dich gerne zu Dinner, Events oder auf Reisen.`,
      'Diskretion und ein respektvoller Umgang sind mir sehr wichtig. Schreib mir einfach und wir planen gemeinsam etwas Besonderes.',
    ].join('\n\n');
    await query(
      `INSERT INTO escorts
        (slug, name, age, city, tagline, bio, height, nationality, languages, services, rates,
         phone, whatsapp, accent, verified, available, featured, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        `${slugify(name)}-${slugify(city)}`,
        name,
        age,
        city,
        tagline,
        bio,
        height,
        nationality,
        ['de:native', 'en:fluent'],
        services[i % services.length],
        JSON.stringify([
          { label: '1 Stunde', price: `${250 + (i % 4) * 50} €` },
          { label: '3 Stunden', price: `${650 + (i % 4) * 100} €` },
          { label: 'Overnight', price: `${1500 + (i % 4) * 200} €` },
        ]),
        '',
        '',
        accent,
        i % 3 !== 2,
        i % 5 !== 4,
        i < 5,
        i,
      ],
    );
  }
  console.log(`[seed] ${demo.length} Demo-Profile angelegt`);
}

export { slugify };
