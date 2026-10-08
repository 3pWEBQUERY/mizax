import { query } from './db.js';

const demo = [
  ['Valentina', 24, 'Berlin', 'Elegant, charmant und immer ein Lächeln.', '#8b5cf6', 168, 'Italienisch'],
  ['Mia', 22, 'München', 'Sportlich, lebensfroh und spontan.', '#ec4899', 165, 'Deutsch'],
  ['Sofia', 27, 'Hamburg', 'Kultivierte Begleitung für besondere Abende.', '#6366f1', 172, 'Spanisch'],
  ['Elena', 25, 'Frankfurt', 'Business-Dinner, Events und mehr.', '#0ea5e9', 170, 'Russisch'],
  ['Lara', 23, 'Köln', 'Natürlich, warmherzig und neugierig.', '#f97316', 163, 'Deutsch'],
  ['Amélie', 26, 'Düsseldorf', 'Französischer Charme trifft Stil.', '#14b8a6', 169, 'Französisch'],
  ['Nina', 29, 'Stuttgart', 'Reisebegleitung mit Klasse.', '#a855f7', 174, 'Deutsch'],
  ['Isabella', 24, 'Berlin', 'Kunst, Kultur und gute Gespräche.', '#e11d48', 166, 'Brasilianisch'],
  ['Clara', 28, 'München', 'Die perfekte Begleitung für Ihren Abend.', '#3b82f6', 171, 'Österreichisch'],
  ['Jasmin', 21, 'Hamburg', 'Jung, frech und voller Energie.', '#d946ef', 160, 'Deutsch'],
  ['Victoria', 30, 'Frankfurt', 'Diskret, gebildet, international.', '#06b6d4', 175, 'Britisch'],
  ['Leonie', 25, 'Leipzig', 'Bodenständig mit einem Hauch Glamour.', '#84cc16', 167, 'Deutsch'],
  ['Aurora', 26, 'Köln', 'Für Momente, die man nicht vergisst.', '#f59e0b', 168, 'Schwedisch'],
  ['Melina', 23, 'Düsseldorf', 'Fröhlich, offen und unkompliziert.', '#ef4444', 164, 'Griechisch'],
  ['Zara', 27, 'Berlin', 'Modern, stilsicher und weltoffen.', '#8b5cf6', 173, 'Niederländisch'],
];

const services = [
  ['Dinner Date', 'Begleitung zu Events', 'Reisebegleitung', 'Overnight'],
  ['Dinner Date', 'Stadtführung', 'Wellness', 'Wochenende'],
  ['Business-Events', 'Dinner Date', 'Theater & Oper', 'Reisebegleitung'],
];

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
        ['Deutsch', 'Englisch'],
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
