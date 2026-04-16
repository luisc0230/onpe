'use strict';

const { CandidateHistory } = require('../models');

/**
 * Applies the polling_and_diffing algorithm defined in the spec.
 * Returns { updates, triggered } where triggered contains only candidates whose
 * votes changed (UP or DOWN) — EQUAL candidates do not fire alerts.
 */
async function applyDiff(candidates) {
  const updates = [];
  const triggered = [];

  for (const c of candidates) {
    const existing = await CandidateHistory.findOne({ where: { dni: c.dni } });

    const vNew = Number(c.totalVotosValidos) || 0;
    const vOld = existing ? Number(existing.current_votes) : vNew;

    let trend = 'EQUAL';
    if (!existing) {
      trend = 'EQUAL';
    } else if (vNew > vOld) {
      trend = 'UP';
    } else if (vNew < vOld) {
      trend = 'DOWN';
      // CRITICAL LOG: votes decreased (spec requirement).
      console.warn(
        `[DIFF][CRITICAL] Votes DECREASED for ${c.name} (DNI ${c.dni}): ${vOld} -> ${vNew}`
      );
    }

    if (existing) {
      await existing.update({
        name: c.name,
        party: c.party,
        partyCode: c.partyCode,
        previous_votes: existing.current_votes,
        current_votes: vNew,
        current_percent: c.porcentajeVotosValidos,
        trend,
        last_updated: new Date(),
      });
    } else {
      await CandidateHistory.create({
        dni: c.dni,
        name: c.name,
        party: c.party,
        partyCode: c.partyCode,
        previous_votes: vNew,
        current_votes: vNew,
        current_percent: c.porcentajeVotosValidos,
        trend: 'EQUAL',
        last_updated: new Date(),
      });
    }

    updates.push({ ...c, trend, previous_votes: vOld, current_votes: vNew });
    if (trend === 'UP' || trend === 'DOWN') {
      triggered.push({ ...c, trend, previous_votes: vOld, current_votes: vNew });
    }
  }

  return { updates, triggered };
}

module.exports = { applyDiff };
