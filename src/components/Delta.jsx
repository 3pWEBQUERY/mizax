import { useI18n } from '../lib/i18n.jsx';

// Veränderung zum vorherigen Zeitraum – mit Vorzeichen und Pfeil, nicht nur über die Farbe
export default function Delta({ now, prev }) {
  const { t } = useI18n();
  if (!prev && !now) return null;
  if (!prev) return <span className="delta up">↑ {t('stats.new')}</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  if (pct === 0) return <span className="delta">± 0 %</span>;
  return (
    <span className={`delta ${pct > 0 ? 'up' : 'down'}`}>
      {pct > 0 ? '↑ +' : '↓ '}
      {pct} %
    </span>
  );
}
