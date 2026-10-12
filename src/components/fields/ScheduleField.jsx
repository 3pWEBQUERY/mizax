import { useI18n } from '../../lib/i18n.jsx';
import { weekdayNames } from '../ScheduleCard.jsx';

const DEFAULT = { from: '10:00', to: '22:00' };
// 24-Stunden-Auswahl im Viertelstundentakt (native Zeitfelder zeigen je nach Browser AM/PM)
const TIMES = Array.from(
  { length: 96 },
  (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
);

function TimeSelect({ value, onChange, label }) {
  const options = TIMES.includes(value) ? TIMES : [...TIMES, value].sort();
  return (
    <span className="time-select">
      <select className="input" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
        {options.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </span>
  );
}

// Wochenplan im Editor: pro Tag frei oder von–bis. null = keine festen Zeiten.
export default function ScheduleField({ value, onChange }) {
  const { t, locale } = useI18n();
  const days = weekdayNames(locale, 'long');
  const on = Array.isArray(value);
  const set = (idx, slot) => onChange(value.map((d, i) => (i === idx ? slot : d)));

  return (
    <div className="schedule-field">
      <div className="toggles">
        <button type="button" className={`toggle ${on ? '' : 'on'}`} onClick={() => onChange(null)} aria-pressed={!on}>
          {t('schedule.flexible')}
        </button>
        <button
          type="button"
          className={`toggle ${on ? 'on' : ''}`}
          onClick={() => !on && onChange(Array.from({ length: 7 }, () => ({ ...DEFAULT })))}
          aria-pressed={on}
        >
          {t('schedule.fixed')}
        </button>
      </div>

      {on && (
        <>
          <div className="schedule-rows">
            {days.map((name, idx) => {
              const slot = value[idx];
              return (
                <div key={idx} className={`schedule-row ${slot ? '' : 'off'}`}>
                  <button
                    type="button"
                    className={`schedule-day ${slot ? 'on' : ''}`}
                    onClick={() => set(idx, slot ? null : { ...(value.find(Boolean) || DEFAULT) })}
                    aria-pressed={Boolean(slot)}
                  >
                    <span className="schedule-check" aria-hidden="true" />
                    {name}
                  </button>
                  {slot ? (
                    <span className="schedule-times">
                      <TimeSelect
                        value={slot.from}
                        label={t('schedule.from', { day: name })}
                        onChange={(v) => set(idx, { ...slot, from: v })}
                      />
                      <span className="schedule-dash">–</span>
                      <TimeSelect
                        value={slot.to}
                        label={t('schedule.to', { day: name })}
                        onChange={(v) => set(idx, { ...slot, to: v })}
                      />
                    </span>
                  ) : (
                    <span className="schedule-off">{t('schedule.off')}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="schedule-tools">
            <button
              type="button"
              className="toggle"
              onClick={() => {
                const first = value.find(Boolean) || DEFAULT;
                onChange(value.map((d) => (d ? { ...first } : d)));
              }}
            >
              {t('schedule.copyAll')}
            </button>
          </div>
          <p className="field-hint">{t('schedule.hint')}</p>
        </>
      )}
    </div>
  );
}
