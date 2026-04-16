'use strict';

const onpe = require('./onpe.service');
const { applyDiff } = require('./diff.service');
const { sendBatchedAlert } = require('./mailer.service');
const { CandidateSnapshot } = require('../models');

let lastSnapshot = {
  timestamp: null,
  actasPercent: null,
  candidates: [],
  fetchedAt: null,
};

async function runPollCycle() {
  const startedAt = Date.now();
  console.log('[POLL] Starting cycle...');

  const [totales, participantes] = await Promise.all([
    onpe.fetchTotales().catch((e) => {
      console.error('[POLL] totales failed:', e.message);
      return { timestamp: null, actasPercent: null };
    }),
    onpe.fetchParticipantes().catch((e) => {
      console.error('[POLL] participantes failed:', e.message);
      return { candidates: [] };
    }),
  ]);

  const sorted = [...participantes.candidates].sort(
    (a, b) => b.totalVotosValidos - a.totalVotosValidos
  );

  const { triggered } = await applyDiff(sorted);

  // Append-only timeseries. De-duplicated by ONPE's upstream timestamp so repeated
  // polls that hit the same cached payload don't bloat the history.
  if (sorted.length && totales.timestampMs) {
    const existing = await CandidateSnapshot.count({
      where: { upstream_ts_ms: String(totales.timestampMs) },
    });
    if (existing === 0) {
      await CandidateSnapshot.bulkCreate(
        sorted.map((c) => ({
          dni: c.dni,
          name: c.name,
          party: c.party,
          party_code: c.partyCode,
          votes: c.totalVotosValidos,
          percent_valid: c.porcentajeVotosValidos,
          percent_emitted: c.porcentajeVotosEmitidos,
          actas_percent: totales.actasPercent,
          upstream_ts_ms: totales.timestampMs,
          captured_at: new Date(),
        }))
      );
      console.log(`[POLL] Snapshot stored (${sorted.length} rows) @ ${totales.timestampMs}`);
    }
  }

  lastSnapshot = {
    timestamp: totales.timestamp,
    actasPercent: totales.actasPercent,
    candidates: sorted,
    fetchedAt: new Date().toISOString(),
  };

  if (triggered.length) {
    try {
      await sendBatchedAlert({
        timestamp: totales.timestamp,
        actasPercent: totales.actasPercent,
        triggered,
        allCandidatesSorted: sorted,
      });
    } catch (err) {
      console.error('[POLL] mailer failed:', err.message);
    }
  }

  console.log(
    `[POLL] Done in ${Date.now() - startedAt}ms · candidates=${sorted.length} triggered=${triggered.length}`
  );
  return lastSnapshot;
}

function getLastSnapshot() {
  return lastSnapshot;
}

module.exports = { runPollCycle, getLastSnapshot };
