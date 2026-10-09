const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

// „vor 5 Minuten“, „gestern“ … in der aktuellen Sprache; ältere Daten als Datum
export function timeAgo(date, locale, style = 'long') {
  const d = new Date(date);
  const diff = (d.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style });
  if (abs < 45) return rtf.format(0, 'second');
  if (abs >= 7 * 86400) return shortDate(d, locale);
  for (const [unit, secs] of UNITS) {
    if (abs >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(Math.round(diff / 60), 'minute');
}

export function shortDate(date, locale) {
  const d = new Date(date);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  }).format(d);
}

export function clockTime(date, locale) {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

// Trenner im Chat: „Heute“, „Gestern“ oder Datum
export function dayLabel(date, locale) {
  const d = new Date(date);
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(d) - start(new Date())) / 86400000);
  if (days >= -1) {
    const s = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

export function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function formatNumber(n, locale) {
  return new Intl.NumberFormat(locale).format(n || 0);
}
