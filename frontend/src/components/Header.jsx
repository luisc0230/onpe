import { motion } from 'framer-motion';
import { fmtPct } from '../lib/format';
import ldxLogo from '../images/LOGOS.png';

export default function Header({ timestamp, actasPercentage, onOpenSubscribe }) {
  const pct = Number(actasPercentage ?? 0);
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={ldxLogo}
            alt="LDX Software"
            className="h-10 w-auto sm:h-11 object-contain shrink-0"
          />
          <div>
            <h1 className="text-sm sm:text-base font-bold leading-tight">
              Elecciones 2026 · Monitor en Vivo
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-tight">
              {timestamp || 'Esperando actualización…'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-64">
            <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
              <span>Actas contabilizadas</span>
              <span className="font-semibold tabular-nums">{fmtPct(pct, 4)}</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-brand-600"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, pct)}%` }}
                transition={{ type: 'spring', stiffness: 60, damping: 20 }}
              />
            </div>
          </div>
          <button
            onClick={onOpenSubscribe}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3 py-2 text-xs sm:text-sm font-semibold hover:bg-slate-800 transition"
          >
            Suscribirme
          </button>
        </div>
      </div>
    </header>
  );
}
