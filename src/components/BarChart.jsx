import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n.jsx';
import { formatNumber } from '../lib/time.js';

// „schöne“ Achsenschritte, nur ganze Zahlen (es sind Zählwerte)
function niceTicks(max) {
  const m = Math.max(1, max);
  const raw = m / 3;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((k) => k * p).find((s) => s >= raw));
  const top = Math.ceil(m / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return ticks;
}

const parseDay = (day) => {
  const [y, mo, d] = day.split('-').map(Number);
  return new Date(y, mo - 1, d);
};

// Säulendiagramm für eine einzelne Reihe (kein Legendenkasten – der Titel benennt die Reihe)
export default function BarChart({ data, label, height = 220, compact = false }) {
  const { locale } = useI18n();
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = ref.current;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const ticks = niceTicks(Math.max(0, ...data.map((d) => d.value)));
  const top = ticks[ticks.length - 1];
  const padL = compact ? 0 : 34;
  const padB = compact ? 0 : 24;
  const padT = compact ? 4 : 10;
  const plotW = Math.max(0, width - padL);
  const plotH = height - padB - padT;
  const base = padT + plotH;
  const n = data.length || 1;
  const slot = plotW / n;
  const barW = Math.max(2, Math.min(slot - 2, slot * 0.62, compact ? 12 : 22));
  const dayFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const longFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long' });
  const xLabels = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];

  const bar = (d, i) => {
    const h = d.value ? Math.max(2, (d.value / top) * plotH) : 0;
    const x = padL + slot * i + (slot - barW) / 2;
    const y = base - h;
    const r = Math.min(4, barW / 2, h);
    return { x, y, h, path: `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${base} Z` };
  };

  const active = hover != null ? data[hover] : null;
  const activeBar = active ? bar(active, hover) : null;

  return (
    <div className={`chart ${compact ? 'compact' : ''}`} ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
          {!compact &&
            ticks.map((v) => {
              const y = base - (v / top) * plotH;
              return (
                <g key={v}>
                  <line x1={padL} x2={width} y1={y} y2={y} className={v === 0 ? 'chart-base' : 'chart-grid'} />
                  <text x={padL - 8} y={y} className="chart-tick" textAnchor="end" dominantBaseline="middle">
                    {formatNumber(v, locale)}
                  </text>
                </g>
              );
            })}
          {compact && <line x1={0} x2={width} y1={base} y2={base} className="chart-base" />}
          {data.map((d, i) => {
            const b = bar(d, i);
            return (
              b.h > 0 && (
                <motion.path
                  key={d.day}
                  d={b.path}
                  className="chart-bar"
                  style={{ transformOrigin: `0px ${base}px`, opacity: hover == null || hover === i ? 1 : 0.45 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 30, delay: Math.min(i * 0.012, 0.4) }}
                />
              )
            );
          })}
          {!compact &&
            xLabels.map((i) => (
              <text
                key={i}
                x={padL + slot * i + slot / 2}
                y={height - 6}
                className="chart-tick"
                textAnchor={i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}
              >
                {dayFmt.format(parseDay(data[i].day))}
              </text>
            ))}
          {/* Trefferflächen: ganze Spalte, größer als die Säule */}
          {data.map((d, i) => (
            <rect
              key={d.day}
              x={padL + slot * i}
              y={padT}
              width={slot}
              height={plotH}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
            />
          ))}
        </svg>
      )}
      {active && (
        <div
          className="chart-tip"
          style={{
            left: Math.min(Math.max(padL + slot * hover + slot / 2, 60), width - 60),
            top: Math.max(activeBar.y - 8, 0),
          }}
        >
          <b>{formatNumber(active.value, locale)}</b> {label}
          <span>{longFmt.format(parseDay(active.day))}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">{longFmt.format(parseDay(d.day))}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
