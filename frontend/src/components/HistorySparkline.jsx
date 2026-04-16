/**
 * Lightweight hand-rolled SVG sparkline — no external chart dependency.
 * Plots a numeric series (votes or %) with a gradient fill, axis guides,
 * and a crosshair tooltip on hover/touch.
 */
import { useMemo, useRef, useState } from 'react';
import { fmtInt, fmtPct } from '../lib/format';

const PAD = { top: 16, right: 16, bottom: 28, left: 48 };

export default function HistorySparkline({
  series,
  metric = 'votes', // 'votes' | 'percentValid'
  height = 220,
  accent = '#be123c',
}) {
  const wrapRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [width, setWidth] = useState(720);

  // ResizeObserver (inlined) to make chart fully responsive.
  useMemo(() => {
    if (!wrapRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(320, e.contentRect.width));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [wrapRef.current]);

  const points = useMemo(() => {
    if (!series?.length) return [];
    const xs = series.map((_, i) => i);
    const ys = series.map((p) => Number(p[metric] ?? 0));
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeY = maxY - minY || 1;

    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;

    return xs.map((x, i) => ({
      x: PAD.left + (x / Math.max(1, xs.length - 1)) * innerW,
      y: PAD.top + innerH - ((ys[i] - minY) / rangeY) * innerH,
      raw: series[i],
      value: ys[i],
      minY,
      maxY,
    }));
  }, [series, metric, width, height]);

  if (!series?.length) {
    return (
      <div ref={wrapRef} className="text-center text-sm text-slate-500 py-10">
        Aún no hay historial. Espera la próxima actualización.
      </div>
    );
  }

  const pathD = points.reduce(
    (acc, p, i) => acc + `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)} `,
    ''
  );
  const areaD =
    pathD +
    `L ${points[points.length - 1].x.toFixed(2)} ${height - PAD.bottom} ` +
    `L ${points[0].x.toFixed(2)} ${height - PAD.bottom} Z`;

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.value - first.value;
  const deltaPct = first.value ? (delta / first.value) * 100 : 0;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i += 1) {
      const d = Math.abs(points[i].x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setHoverIdx(best);
  };

  const fmt = (v) => (metric === 'votes' ? fmtInt(v) : fmtPct(v));
  const hover = hoverIdx != null ? points[hoverIdx] : null;

  return (
    <div ref={wrapRef} className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-500">
          {series.length} muestra{series.length === 1 ? '' : 's'} · inicio {fmt(first.value)} → actual{' '}
          <span className="font-semibold text-slate-800">{fmt(last.value)}</span>
        </div>
        <div
          className={`text-xs font-bold ${
            delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-slate-500'
          }`}
        >
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {fmt(Math.abs(delta))}{' '}
          {metric === 'votes' && `(${deltaPct.toFixed(2)}%)`}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full select-none touch-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchStart={onMove}
        onTouchMove={onMove}
        onTouchEnd={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y axis guides */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD.top + (height - PAD.top - PAD.bottom) * t;
          const v = first.maxY - (first.maxY - first.minY) * t;
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text x={PAD.left - 6} y={y + 3} fontSize="10" textAnchor="end" fill="#94a3b8">
                {metric === 'votes' ? Math.round(v).toLocaleString('es-PE') : `${v.toFixed(1)}%`}
              </text>
            </g>
          );
        })}

        <path d={areaD} fill="url(#spark-fill)" />
        <path d={pathD} fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />

        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === hoverIdx ? 5 : 2.5} fill={accent} />
        ))}

        {hover && (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PAD.top}
              y2={height - PAD.bottom}
              stroke={accent}
              strokeDasharray="3 3"
              opacity="0.6"
            />
            <rect
              x={Math.min(width - 160, Math.max(PAD.left, hover.x + 8))}
              y={Math.max(PAD.top, hover.y - 40)}
              width="150"
              height="38"
              rx="8"
              fill="#0f172a"
            />
            <text
              x={Math.min(width - 160, Math.max(PAD.left, hover.x + 8)) + 10}
              y={Math.max(PAD.top, hover.y - 40) + 15}
              fontSize="10"
              fill="#cbd5e1"
            >
              {hover.raw.capturedAt
                ? new Date(hover.raw.capturedAt).toLocaleString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </text>
            <text
              x={Math.min(width - 160, Math.max(PAD.left, hover.x + 8)) + 10}
              y={Math.max(PAD.top, hover.y - 40) + 30}
              fontSize="12"
              fontWeight="bold"
              fill="white"
            >
              {fmt(hover.value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
