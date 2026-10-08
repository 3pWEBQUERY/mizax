import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n.jsx';

export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function formatParts(d, locale = 'de') {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    day: cap(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)),
    date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d),
    time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d),
  };
}

export default function Clock() {
  const { locale } = useI18n();
  const p = formatParts(useNow(), locale);
  return (
    <div className="clock" aria-hidden="true">
      {p.day}
      <br />
      {p.date}
      <br />
      {p.time}
    </div>
  );
}
