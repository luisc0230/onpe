import { fmtInt } from '../lib/format';

/**
 * Tiny inline sparkline (last 3 cycles: previous-previous, previous, current).
 * Replaces the static "Igual" badge with a live micro-history.
 */
export default function MiniTrend({ history = [], metric = 'votes', size = 'sm' }) {
  if (!history.length) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-50 ring-1 ring-slate-200 px-2 py-0.5 rounded-full text-[10px] font-medium">
        sin historial
      </span>
    );
  }

  const vals = history.map((h) => Number(h[metric] ?? 0));
  const last = vals[vals.length - 1];
  const first = vals[0];
  // Single source of truth: delta across the full visible window (first → last).
  // This keeps the arrow, color, line direction and the numeric label consistent.
  const delta = last - first;

  const color = delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#64748b';
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '=';

  const W = size === 'lg' ? 80 : 60;
  const H = size === 'lg' ? 28 : 22;
  const PAD = 3;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const points = vals.map((v, i) => {
    const x = PAD + (i / Math.max(1, vals.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return { x, y };
  });

  const path = points.reduce(
    (acc, p, i) => acc + `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)} `,
    ''
  );
  const area =
    path +
    ` L ${points[points.length - 1].x.toFixed(2)} ${H - PAD} L ${points[0].x.toFixed(2)} ${H - PAD} Z`;

  const fmt = (n) => (metric === 'votes' ? fmtInt(n) : `${n.toFixed(2)}%`);

  return (
    <div className="inline-flex items-center gap-1.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="shrink-0"
        aria-label="mini historial"
      >
        <defs>
          <linearGradient id={`mt-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#mt-${color})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 2.6 : 1.8}
            fill={color}
          />
        ))}
      </svg>
      <span
        className="text-[10px] font-bold tabular-nums whitespace-nowrap"
        style={{ color }}
        title={vals.map(fmt).join(' → ')}
      >
        {arrow} {delta === 0 ? '0' : (delta > 0 ? '+' : '') + fmt(Math.abs(delta))}
      </span>
    </div>
  );
}
