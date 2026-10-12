import { useI18n } from '../lib/i18n.jsx';
import { nextOpening, zurichNow } from '../lib/schedule.js';

// Wochentagsnamen ab Montag in der aktuellen Sprache
export function weekdayNames(locale, style = 'long') {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' });
  // 5. Januar 2026 ist ein Montag
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2026, 0, 5 + i))));
}

// „Heute ab 18:00“, „Morgen ab 10:00“, „Freitag ab 12:00“ – oder null
export function nextOpeningText(t, locale, schedule) {
  const next = nextOpening(schedule);
  if (!next) return null;
  if (next.offset === 0) return t('schedule.todayFrom', { time: next.from });
  if (next.offset === 1) return t('schedule.tomorrowFrom', { time: next.from });
  return t('schedule.dayFrom', { day: weekdayNames(locale)[next.day], time: next.from });
}

// Karte „Verfügbarkeit“ im Profil
export default function ScheduleCard({ schedule }) {
  const { t, locale } = useI18n();
  const names = weekdayNames(locale);
  const today = zurichNow().day;
  return (
    <dl className="schedule-list">
      {names.map((name, idx) => {
        const slot = schedule[idx];
        return (
          <div key={idx} className={`schedule-item ${idx === today ? 'today' : ''} ${slot ? '' : 'off'}`}>
            <dt>{name}</dt>
            <dd>
              {!slot ? t('schedule.off') : slot.from === slot.to ? t('schedule.allDay') : `${slot.from} – ${slot.to}`}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
