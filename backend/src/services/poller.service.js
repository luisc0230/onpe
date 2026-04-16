'use strict';

const { Op, fn, col, literal } = require('sequelize');
const onpe = require('./onpe.service');
const { applyDiff } = require('./diff.service');
const { sendBatchedAlert } = require('./mailer.service');
const { CandidateSnapshot } = require('../models');

/**
 * Returns a map { dni -> [ {votes, percentValid, capturedAt}, ... ] } with the
 * last N poll cycles (ASC order). Used to build the mini trend shown on each
 * podium card without extra HTTP round-trips from the client.
 */
async function loadRecentHistoryByDni(limitCycles = 3) {
  const cycles = await CandidateSnapshot.findAll({
    attributes: [[fn('DISTINCT', col('upstream_ts_ms')), 'upstream_ts_ms']],
    order: [[literal('upstream_ts_ms'), 'DESC']],
    limit: limitCycles,
    raw: true,
  });
  const tsList = cycles.map((r) => r.upstream_ts_ms).filter(Boolean);
  if (!tsList.length) return {};

  const rows = await CandidateSnapshot.findAll({
    where: { upstream_ts_ms: { [Op.in]: tsList } },
    order: [['upstream_ts_ms', 'ASC']],
  });

  const byDni = {};
  for (const r of rows) {
    const list = byDni[r.dni] || (byDni[r.dni] = []);
    list.push({
      votes: r.votes,
      percentValid: r.percent_valid,
      capturedAt: r.captured_at,
      upstreamTsMs: r.upstream_ts_ms ? Number(r.upstream_ts_ms) : null,
    });
  }
  return byDni;
}

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
  // OPTIMIZATION: Only store TOP 5 candidates to reduce DB size (every 15min = 5 rows instead of 33).
  if (sorted.length && totales.timestampMs) {
    const existing = await CandidateSnapshot.count({
      where: { upstream_ts_ms: String(totales.timestampMs) },
    });
    if (existing === 0) {
      const top5 = sorted.slice(0, 5); // Only store Top 5
      await CandidateSnapshot.bulkCreate(
        top5.map((c) => ({
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
      console.log(`[POLL] Snapshot stored (TOP ${top5.length} only) @ ${totales.timestampMs}`);
    }
  }

  // Attach last 3 cycles of history to each candidate for inline mini-trend UI.
  const historyByDni = await loadRecentHistoryByDni(3);
  const candidatesWithHistory = sorted.map((c) => ({
    ...c,
    recentHistory: historyByDni[c.dni] || [],
  }));

  lastSnapshot = {
    timestamp: totales.timestamp,
    actasPercent: totales.actasPercent,
    candidates: candidatesWithHistory,
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
