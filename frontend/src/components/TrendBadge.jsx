export default function TrendBadge({ trend }) {
  if (trend === 'UP') {
    return (
      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 ring-1 ring-green-200 px-2 py-0.5 rounded-full text-xs font-semibold">
        ▲ Sube
      </span>
    );
  }
  if (trend === 'DOWN') {
    return (
      <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 ring-1 ring-red-200 px-2 py-0.5 rounded-full text-xs font-bold">
        ▼ Baja
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 ring-1 ring-slate-200 px-2 py-0.5 rounded-full text-xs font-medium">
      = Igual
    </span>
  );
}
