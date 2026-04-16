'use strict';

const { Router } = require('express');
const { fn, col, literal } = require('sequelize');
const { getLastSnapshot, runPollCycle } = require('../services/poller.service');
const { CandidateHistory, CandidateSnapshot } = require('../models');

const router = Router();

router.get('/snapshot', async (_req, res) => {
  const snap = getLastSnapshot();
  if (!snap.fetchedAt) {
    // Lazy warm-up if the first cycle has not finished yet.
    try {
      const fresh = await runPollCycle();
      return res.json(fresh);
    } catch (err) {
      return res.status(503).json({ error: 'Upstream not ready', detail: err.message });
    }
  }
  res.json(snap);
});

router.get('/candidates', async (_req, res) => {
  const rows = await CandidateHistory.findAll({ order: [['current_votes', 'DESC']] });
  res.json(rows);
});

/**
 * Distinct capture timestamps (one entry per poll cycle). Lightweight index
 * used by the frontend to render timeline ticks and pagination.
 */
router.get('/history/timeline', async (_req, res) => {
  const rows = await CandidateSnapshot.findAll({
    attributes: [
      [fn('DISTINCT', col('upstream_ts_ms')), 'upstream_ts_ms'],
      [fn('MAX', col('captured_at')), 'captured_at'],
      [fn('MAX', col('actas_percent')), 'actas_percent'],
    ],
    group: ['upstream_ts_ms'],
    order: [[literal('upstream_ts_ms'), 'ASC']],
    raw: true,
  });
  res.json(rows);
});

/**
 * Full timeseries for a single candidate (by DNI), ordered by time ASC.
 * Powers the per-candidate comparator chart + detail table.
 */
router.get('/history/:dni', async (req, res) => {
  const { dni } = req.params;
  const rows = await CandidateSnapshot.findAll({
    where: { dni },
    order: [['upstream_ts_ms', 'ASC']],
  });
  if (!rows.length) return res.json({ dni, series: [] });
  const head = rows[rows.length - 1];
  res.json({
    dni,
    name: head.name,
    party: head.party,
    partyCode: head.party_code,
    series: rows.map((r) => ({
      capturedAt: r.captured_at,
      upstreamTsMs: r.upstream_ts_ms ? Number(r.upstream_ts_ms) : null,
      votes: r.votes,
      percentValid: r.percent_valid,
      percentEmitted: r.percent_emitted,
      actasPercent: r.actas_percent,
    })),
  });
});

/**
 * Compact multi-candidate comparator: latest N snapshots aggregated by
 * upstream_ts_ms, returning one row per (ts, dni) — useful for overlayed charts.
 */
router.get('/history', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 200);
  const rows = await CandidateSnapshot.findAll({
    order: [['upstream_ts_ms', 'DESC']],
    limit: limit * 50,
  });
  res.json(rows);
});

router.post('/refresh', async (_req, res) => {
  try {
    const snap = await runPollCycle();
    res.json({ ok: true, snapshot: snap });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
