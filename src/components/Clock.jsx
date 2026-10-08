import { useEffect, useState } from 'react';

const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const months = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];

export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function formatParts(d) {
  return {
    day: days[d.getDay()],
    date: `${d.getDate()}. ${months[d.getMonth()]}`,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

export default function Clock() {
  const p = formatParts(useNow());
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
