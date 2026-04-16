import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CandidateImage from './CandidateImage';
import TrendBadge from './TrendBadge';
import { fmtInt, fmtPct } from '../lib/format';

const RANK_META = {
  1: {
    label: '1° LUGAR',
    ring: 'ring-amber-400',
    medal: 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950',
    bar: 'bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500',
    cardBorder: 'ring-amber-300 shadow-[0_10px_40px_-12px_rgba(245,158,11,0.45)]',
    crown: '👑',
    step: 'h-56 sm:h-60',
  },
  2: {
    label: '2° LUGAR',
    ring: 'ring-slate-300',
    medal: 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800',
    bar: 'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400',
    cardBorder: 'ring-slate-200 shadow-[0_8px_30px_-12px_rgba(148,163,184,0.4)]',
    crown: '🥈',
    step: 'h-44 sm:h-48',
  },
  3: {
    label: '3° LUGAR',
    ring: 'ring-orange-300',
    medal: 'bg-gradient-to-br from-orange-300 to-orange-600 text-orange-50',
    bar: 'bg-gradient-to-r from-orange-300 via-orange-400 to-orange-600',
    cardBorder: 'ring-orange-200 shadow-[0_8px_30px_-12px_rgba(234,88,12,0.4)]',
    crown: '🥉',
    step: 'h-36 sm:h-40',
  },
};

const trendText = (t) =>
  t === 'UP' ? 'text-green-700' : t === 'DOWN' ? 'text-red-700' : 'text-slate-700';

/* ───────────────────────── MOBILE: cards stacked vertically ───────────────────────── */

function MobilePodiumCard({ rank, candidate, onSelect }) {
  const meta = RANK_META[rank];
  return (
    <motion.button
      layout
      layoutId={`pm-${candidate.dni}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20, delay: (rank - 1) * 0.05 }}
      onClick={() => onSelect?.(candidate)}
      className={`w-full text-left relative bg-white rounded-2xl ring-1 ${meta.cardBorder} p-4 flex items-center gap-4 overflow-hidden`}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 ${meta.bar}`} />

      <div className={`relative shrink-0 rounded-full p-1 ring-4 ${meta.ring} bg-white`}>
        <CandidateImage src={candidate.photoUrl} alt={candidate.name} size={64} />
        <div
          className={`absolute -top-1 -right-1 w-7 h-7 rounded-full grid place-items-center text-xs font-extrabold ${meta.medal} ring-2 ring-white`}
        >
          {rank}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-extrabold tracking-wider text-slate-500">
            {meta.label}
          </span>
          <span className="text-base">{meta.crown}</span>
        </div>
        <div className="font-bold text-[15px] leading-tight line-clamp-2 break-words">
          {candidate.name}
        </div>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <CandidateImage src={candidate.logoUrl} alt={candidate.party} size={14} rounded="lg" />
          <span className="text-[11px] text-slate-500 truncate">{candidate.party}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className={`font-extrabold text-xl tabular-nums ${trendText(candidate.trend)}`}>
          {fmtPct(candidate.porcentajeVotosValidos)}
        </div>
        <div className="text-[10px] text-slate-500 tabular-nums">
          {fmtInt(candidate.totalVotosValidos)}
        </div>
        <div className="mt-1">
          <TrendBadge trend={candidate.trend} />
        </div>
      </div>
    </motion.button>
  );
}

/* ───────────────────────── DESKTOP: classic 2-1-3 podium ───────────────────────── */

function DesktopStep({ rank, candidate, onSelect }) {
  const meta = RANK_META[rank];
  const order = rank === 2 ? 'order-1' : rank === 1 ? 'order-2' : 'order-3';
  return (
    <motion.button
      layout
      layoutId={`pd-${candidate.dni}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18, delay: (4 - rank) * 0.1 }}
      onClick={() => onSelect?.(candidate)}
      className={`${order} flex-1 flex flex-col items-center min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl`}
    >
      {/* Avatar */}
      <div className={`relative rounded-full p-1 ring-4 ${meta.ring} bg-white shadow-lg`}>
        <CandidateImage
          src={candidate.photoUrl}
          alt={candidate.name}
          size={rank === 1 ? 120 : 92}
        />
        <div
          className={`absolute -top-2 -right-2 w-9 h-9 rounded-full grid place-items-center text-sm font-extrabold ${meta.medal} ring-2 ring-white`}
        >
          {rank}
        </div>
      </div>

      {/* Name block */}
      <div className="mt-3 text-center px-2 w-full max-w-[16rem]">
        <div className="text-[10px] font-extrabold tracking-wider text-slate-500">{meta.label}</div>
        <div className="font-bold text-sm leading-tight line-clamp-2 break-words">
          {candidate.name}
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1 min-w-0">
          <CandidateImage src={candidate.logoUrl} alt={candidate.party} size={16} rounded="lg" />
          <span className="text-[11px] text-slate-500 truncate">{candidate.party}</span>
        </div>
      </div>

      {/* Step */}
      <div
        className={`mt-3 w-full ${meta.step} rounded-t-2xl bg-gradient-to-b from-white to-slate-50 ring-1 ring-slate-200 flex flex-col items-center justify-center px-2 py-3`}
      >
        <div className="text-2xl mb-1">{meta.crown}</div>
        <div className={`font-extrabold text-2xl tabular-nums ${trendText(candidate.trend)}`}>
          {fmtPct(candidate.porcentajeVotosValidos)}
        </div>
        <div className="text-[11px] text-slate-500 tabular-nums">
          {fmtInt(candidate.totalVotosValidos)} votos
        </div>
        <div className="mt-2">
          <TrendBadge trend={candidate.trend} />
        </div>
      </div>
    </motion.button>
  );
}

/* ───────────────────────── Runner-up row ───────────────────────── */

function RunnerUpRow({ candidate, rank, onSelect }) {
  const trendClass =
    candidate.trend === 'UP'
      ? 'ring-green-200'
      : candidate.trend === 'DOWN'
      ? 'ring-red-200 bg-red-50'
      : 'ring-slate-200';

  return (
    <motion.li
      layout
      layoutId={`row-${candidate.dni}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect?.(candidate)}
      className={`group flex items-center gap-3 rounded-xl ring-1 ${trendClass} bg-white p-3 cursor-pointer hover:ring-brand-300 hover:shadow-sm transition active:scale-[0.99]`}
    >
      <div className="w-6 sm:w-7 text-center text-sm font-bold text-slate-400 tabular-nums shrink-0">
        {rank}
      </div>
      <CandidateImage src={candidate.photoUrl} alt={candidate.name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm leading-tight line-clamp-2 break-words">
          {candidate.name}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <CandidateImage src={candidate.logoUrl} alt={candidate.party} size={12} rounded="lg" />
          <span className="text-[11px] text-slate-500 truncate">{candidate.party}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`font-bold text-sm tabular-nums ${trendText(candidate.trend)}`}>
          {fmtPct(candidate.porcentajeVotosValidos)}
        </div>
        <div className="text-[10px] text-slate-500 tabular-nums">
          {fmtInt(candidate.totalVotosValidos)}
        </div>
      </div>
    </motion.li>
  );
}

/* ───────────────────────── Main Podium ───────────────────────── */

const INITIAL_VISIBLE = 3;

export default function Podium({ candidates, onSelect }) {
  const [showAll, setShowAll] = useState(false);

  if (!candidates?.length) {
    return (
      <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-8 text-center text-slate-500">
        Sin datos disponibles por el momento.
      </div>
    );
  }

  const sorted = [...candidates].sort((a, b) => b.totalVotosValidos - a.totalVotosValidos);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const visibleRest = showAll ? rest : rest.slice(0, INITIAL_VISIBLE);
  const hiddenCount = rest.length - visibleRest.length;

  return (
    <div className="space-y-6">
      {/* === Podium === */}
      <section className="relative rounded-3xl bg-gradient-to-b from-slate-50 via-white to-white ring-1 ring-slate-200 p-4 sm:p-8 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-x-0 -top-20 h-40 bg-gradient-to-b from-amber-100/60 via-transparent to-transparent blur-2xl"
        />

        {/* Mobile: vertical stacked cards */}
        <div className="relative sm:hidden space-y-3">
          {top3.map((c, i) => (
            <MobilePodiumCard key={c.dni} rank={i + 1} candidate={c} onSelect={onSelect} />
          ))}
        </div>

        {/* Desktop: classic podium */}
        <div className="relative hidden sm:flex items-end justify-center gap-6">
          {top3[1] && <DesktopStep rank={2} candidate={top3[1]} onSelect={onSelect} />}
          {top3[0] && <DesktopStep rank={1} candidate={top3[0]} onSelect={onSelect} />}
          {top3[2] && <DesktopStep rank={3} candidate={top3[2]} onSelect={onSelect} />}
        </div>
        <div className="hidden sm:block relative mt-2 h-2 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full" />
      </section>

      {/* === Rest === */}
      {rest.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-700">
              Resto de candidatos{' '}
              <span className="text-slate-400 font-normal">({rest.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Toca una fila para ver el historial
            </span>
          </div>

          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {visibleRest.map((c, i) => (
                <RunnerUpRow
                  key={c.dni}
                  candidate={c}
                  rank={i + 4}
                  onSelect={onSelect}
                />
              ))}
            </AnimatePresence>
          </ul>

          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-3 w-full rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50 py-3 text-sm font-semibold text-slate-700 transition"
            >
              Ver {hiddenCount} candidato{hiddenCount === 1 ? '' : 's'} más ↓
            </button>
          )}
          {showAll && rest.length > INITIAL_VISIBLE && (
            <button
              onClick={() => setShowAll(false)}
              className="mt-3 w-full rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50 py-3 text-sm font-semibold text-slate-500 transition"
            >
              Ver menos ↑
            </button>
          )}
        </section>
      )}
    </div>
  );
}
