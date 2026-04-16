import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CandidateImage from './CandidateImage';
import HistorySparkline from './HistorySparkline';
import { getCandidateHistory } from '../lib/api';
import { fmtInt, fmtPct } from '../lib/format';

export default function CandidateHistoryModal({ open, onClose, candidate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [metric, setMetric] = useState('votes'); // 'votes' | 'percentValid'

  useEffect(() => {
    if (!open || !candidate?.dni) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCandidateHistory(candidate.dni)
      .then((res) => !cancelled && setData(res))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, candidate?.dni]);

  const series = data?.series || [];
  const diffs = series.map((p, i) => {
    const prev = i === 0 ? p : series[i - 1];
    return {
      ...p,
      deltaVotes: p.votes - prev.votes,
      deltaPct: p.percentValid - prev.percentValid,
    };
  });

  return (
    <AnimatePresence>
      {open && candidate && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-md bg-slate-900/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start gap-4">
              <CandidateImage src={candidate.photoUrl} alt={candidate.name} size={64} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold tracking-wider text-slate-500">
                  HISTORIAL DEL CANDIDATO
                </div>
                <h2 className="text-lg sm:text-xl font-bold leading-tight truncate">
                  {candidate.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 min-w-0">
                  <CandidateImage src={candidate.logoUrl} alt={candidate.party} size={16} rounded="lg" />
                  <span className="text-xs text-slate-500 truncate">{candidate.party}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-full w-8 h-8 grid place-items-center hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 space-y-5">
              {loading && <div className="text-center text-sm text-slate-500 py-8">Cargando historial…</div>}
              {error && (
                <div className="rounded-xl ring-1 ring-red-200 bg-red-50 text-red-700 p-3 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && series.length === 0 && (
                <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50 p-6 text-center">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="font-semibold text-slate-700 mb-1">Historial no disponible</p>
                  <p className="text-sm text-slate-500">
                    Solo guardamos el historial de los <strong>Top 5</strong> candidatos para optimizar el almacenamiento.
                  </p>
                </div>
              )}

              {!loading && !error && series.length > 0 && (
                <>
                  {/* Metric toggle */}
                  <div className="inline-flex rounded-xl ring-1 ring-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                    {[
                      { k: 'votes', label: 'Votos' },
                      { k: 'percentValid', label: '% Válidos' },
                    ].map((opt) => (
                      <button
                        key={opt.k}
                        onClick={() => setMetric(opt.k)}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          metric === opt.k
                            ? 'bg-white shadow text-slate-900'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <HistorySparkline series={series} metric={metric} />

                  {/* History table */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-2">
                      Todas las actualizaciones ({series.length})
                    </h3>
                    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="text-left font-semibold px-3 py-2">Fecha</th>
                            <th className="text-right font-semibold px-3 py-2">Votos</th>
                            <th className="text-right font-semibold px-3 py-2">Δ</th>
                            <th className="text-right font-semibold px-3 py-2">% Vál.</th>
                            <th className="text-right font-semibold px-3 py-2 hidden sm:table-cell">Actas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...diffs].reverse().map((p, i) => {
                            const up = p.deltaVotes > 0;
                            const down = p.deltaVotes < 0;
                            return (
                              <tr
                                key={`${p.upstreamTsMs}-${i}`}
                                className={`border-t border-slate-100 ${
                                  down ? 'bg-red-50 text-red-700 font-semibold' : ''
                                }`}
                              >
                                <td className="px-3 py-2 tabular-nums">
                                  {p.capturedAt
                                    ? new Date(p.capturedAt).toLocaleString('es-PE', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{fmtInt(p.votes)}</td>
                                <td
                                  className={`px-3 py-2 text-right tabular-nums ${
                                    up ? 'text-green-700' : down ? 'text-red-700' : 'text-slate-400'
                                  }`}
                                >
                                  {p.deltaVotes === 0
                                    ? '—'
                                    : `${up ? '▲ +' : '▼ '}${fmtInt(Math.abs(p.deltaVotes))}`}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {fmtPct(p.percentValid)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell text-slate-500">
                                  {fmtPct(p.actasPercent, 3)}
                                </td>
                              </tr>
                            );
                          })}
                          {!diffs.length && (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                                Sin muestras todavía.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
