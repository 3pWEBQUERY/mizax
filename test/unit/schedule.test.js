import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSchedule, isOpen, nextOpening, availableNow } from '../../src/lib/schedule.js';

// 12. Oktober 2026 ist ein Montag; Zeiten in Schweizer Sommerzeit (+02:00)
const at = (iso) => new Date(iso);
const plan = cleanSchedule([
  { from: '10:00', to: '22:00' }, // Mo
  null, // Di
  { from: '20:00', to: '03:00' }, // Mi, über Mitternacht
  { from: '00:00', to: '00:00' }, // Do, ganzer Tag
  null,
  null,
  null,
]);

test('cleanSchedule verwirft ungültige Eingaben', () => {
  assert.equal(cleanSchedule(null), null);
  assert.equal(cleanSchedule([1, 2, 3]), null);
  assert.deepEqual(cleanSchedule([{ from: '25:00', to: '10:00' }, null, null, null, null, null, null])[0], null);
});

test('isOpen innerhalb und ausserhalb der Zeiten', () => {
  assert.equal(isOpen(plan, at('2026-10-12T09:59:00+02:00')), false);
  assert.equal(isOpen(plan, at('2026-10-12T10:00:00+02:00')), true);
  assert.equal(isOpen(plan, at('2026-10-12T22:00:00+02:00')), false);
  assert.equal(isOpen(plan, at('2026-10-13T12:00:00+02:00')), false);
});

test('isOpen über Mitternacht und ganzer Tag', () => {
  assert.equal(isOpen(plan, at('2026-10-14T21:00:00+02:00')), true);
  assert.equal(isOpen(plan, at('2026-10-15T02:30:00+02:00')), true);
  assert.equal(isOpen(plan, at('2026-10-15T23:30:00+02:00')), true);
  assert.equal(isOpen(plan, at('2026-10-16T02:00:00+02:00')), false);
});

test('ohne Zeitplan zählt nur der Schalter', () => {
  assert.equal(isOpen(null), true);
  assert.equal(availableNow({ available: true, schedule: null }), true);
  assert.equal(availableNow({ available: false, schedule: null }), false);
  assert.equal(availableNow({ availableNow: false }), false);
});

test('nextOpening findet den nächsten Beginn', () => {
  assert.deepEqual(nextOpening(plan, at('2026-10-12T08:00:00+02:00')), { offset: 0, day: 0, from: '10:00' });
  assert.deepEqual(nextOpening(plan, at('2026-10-12T23:00:00+02:00')), { offset: 2, day: 2, from: '20:00' });
});
