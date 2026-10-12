// Verfügbarkeitszeiten der Escorts – reines JavaScript, wird auch vom Server verwendet.
// Format: Array mit 7 Einträgen (0 = Montag … 6 = Sonntag), je null (frei) oder
// { from: 'HH:MM', to: 'HH:MM' }. Gleiche Zeiten = ganzer Tag; endet „to“ vor „from“,
// geht die Zeit über Mitternacht in den nächsten Tag. Alle Zeiten gelten in der Schweiz.

export const TZ = 'Europe/Zurich';
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));

// Eingabe prüfen und vereinheitlichen; ungültig → null (kein Zeitplan)
export function cleanSchedule(input) {
  if (!Array.isArray(input) || input.length !== 7) return null;
  return input.map((d) => (d && TIME.test(d.from || '') && TIME.test(d.to || '') ? { from: d.from, to: d.to } : null));
}

// Wochentag (0 = Montag) und Minuten seit Mitternacht in der Schweiz
export function zurichNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export function isOpen(schedule, date = new Date()) {
  if (!Array.isArray(schedule)) return true;
  const { day, minutes } = zurichNow(date);
  const today = schedule[day];
  if (today) {
    const from = toMin(today.from);
    const to = toMin(today.to);
    if (from === to) return true;
    if (from < to ? minutes >= from && minutes < to : minutes >= from) return true;
  }
  // Zeit vom Vortag, die über Mitternacht geht
  const prev = schedule[(day + 6) % 7];
  if (prev) {
    const from = toMin(prev.from);
    const to = toMin(prev.to);
    if (to < from && minutes < to) return true;
  }
  return false;
}

// Nächster Beginn: { offset: 0 = heute, 1 = morgen …, day, from } oder null
export function nextOpening(schedule, date = new Date()) {
  if (!Array.isArray(schedule)) return null;
  const { day, minutes } = zurichNow(date);
  for (let offset = 0; offset < 7; offset++) {
    const d = (day + offset) % 7;
    const slot = schedule[d];
    if (!slot) continue;
    if (offset === 0 && toMin(slot.from) <= minutes) continue;
    return { offset, day: d, from: slot.from };
  }
  return null;
}

// Ist die Escort gerade verfügbar? Schalter „verfügbar“ und – falls vorhanden – Zeitplan.
// Für Gäste liefert der Server nur availableNow (ohne Zeitplan).
export function availableNow(escort, date = new Date()) {
  if (!escort) return false;
  if (escort.schedule === undefined) return escort.availableNow ?? Boolean(escort.available);
  return Boolean(escort.available) && isOpen(escort.schedule, date);
}
