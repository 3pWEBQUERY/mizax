import { test } from 'node:test';
import assert from 'node:assert/strict';
// gleiche Reihenfolge wie in src/lib/i18n.jsx
const LOCALES = ['de', 'en', 'fr', 'es', 'hu', 'pl', 'ro'];
import { mailText } from '../../server/mail/texts.js';

// Alle Sprachen müssen dieselben Texte und Platzhalter haben wie Deutsch
const flat = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[p + k, v]]));
const vars = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();

const load = async (l) => (await import(`../../src/locales/${l}.js`)).default;

test('App-Texte: gleiche Schlüssel und Platzhalter in allen Sprachen', async () => {
  const de = new Map(flat(await load('de')));
  for (const l of LOCALES.filter((x) => x !== 'de')) {
    const xx = new Map(flat(await load(l)));
    const missing = [...de.keys()].filter((k) => !xx.has(k));
    const extra = [...xx.keys()].filter((k) => !de.has(k));
    assert.deepEqual(missing, [], `${l}: fehlende Texte`);
    assert.deepEqual(extra, [], `${l}: überzählige Texte`);
    for (const [k, v] of de) assert.equal(vars(xx.get(k)), vars(v), `${l}: Platzhalter in ${k}`);
  }
});

test('E-Mail-Texte gibt es in allen Sprachen', () => {
  const keys = [
    'reset',
    'message',
    'review',
    'comment',
    'reply',
    'suggestions',
    'suggestionsOne',
    'verifyOk',
    'verifyNo',
  ];
  for (const l of LOCALES) {
    for (const k of keys) {
      const m = mailText(l, k, {
        name: 'A',
        from: 'B',
        n: 2,
        stars: '★',
        reason: 'x',
        plan: 'P',
        amount: 'CHF 1',
        due: 'd',
        number: 'N',
        until: 'u',
      });
      assert.ok(m.subject && m.title && m.lines.length && m.button, `${l}/${k}`);
      assert.ok(!/\{\w+\}/.test([m.subject, m.title, ...m.lines].join(' ')), `${l}/${k}: offener Platzhalter`);
    }
  }
});
