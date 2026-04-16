import { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Podium from './components/Podium';
import SubscribeCTA from './components/SubscribeCTA';
import SubscriptionModal from './components/SubscriptionModal';
import CandidateHistoryModal from './components/CandidateHistoryModal';
import { useElectionData } from './hooks/useElectionData';

// Auto-refresh every 2 minutes (user-facing). Backend cron still handles heavier polling.
const REFRESH_MS = 2 * 60 * 1000;

export default function App() {
  const { data, loading, error, lastFetched, refresh } = useElectionData({ intervalMs: REFRESH_MS });
  const [subOpen, setSubOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);

  return (
    <div className="min-h-full flex flex-col">
      <Header
        timestamp={data?.timestamp}
        actasPercentage={data?.actasPercent}
        onOpenSubscribe={() => setSubOpen(true)}
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold">Podio presidencial</h2>
          <div className="flex items-center gap-2">
            {lastFetched && (
              <span className="text-[11px] text-slate-500">
                Sincronizado: {lastFetched.toLocaleTimeString('es-PE')}
              </span>
            )}
            <button
              onClick={refresh}
              className="rounded-lg ring-1 ring-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
            >
              Refrescar
            </button>
          </div>
        </div>

        {loading && !data && (
          <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-8 text-center text-slate-500">
            Cargando resultados…
          </div>
        )}

        {error && (
          <div className="rounded-xl ring-1 ring-red-200 bg-red-50 text-red-700 p-4 text-sm mb-4">
            {error}
          </div>
        )}

        {data?.candidates && (
          <div className="space-y-8">
            <Podium candidates={data.candidates} onSelect={setHistoryFor} />
            <SubscribeCTA
              onOpen={() => setSubOpen(true)}
              candidateCount={data.candidates.length}
            />
            <div className="text-center text-[11px] text-slate-400">
              Tip: toca cualquier candidato para ver su historial completo de votos.
            </div>
          </div>
        )}
      </main>

      <Footer />

      <SubscriptionModal
        open={subOpen}
        onClose={() => setSubOpen(false)}
        candidates={data?.candidates || []}
      />

      <CandidateHistoryModal
        open={!!historyFor}
        candidate={historyFor}
        onClose={() => setHistoryFor(null)}
      />
    </div>
  );
}
