'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

/**
 * One row per candidate per poll cycle. This is the append-only timeseries
 * that powers the history comparator UI. Never mutate: always insert.
 */
const CandidateSnapshot = sequelize.define(
  'CandidateSnapshot',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dni: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    party: { type: DataTypes.STRING, allowNull: false },
    party_code: { type: DataTypes.STRING, allowNull: false },
    votes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    percent_valid: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    percent_emitted: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    actas_percent: { type: DataTypes.FLOAT, allowNull: true },
    upstream_ts_ms: { type: DataTypes.BIGINT, allowNull: true },
    captured_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'candidate_snapshots',
    timestamps: false,
    indexes: [
      { fields: ['dni', 'captured_at'] },
      { fields: ['upstream_ts_ms'] },
    ],
  }
);

module.exports = CandidateSnapshot;
