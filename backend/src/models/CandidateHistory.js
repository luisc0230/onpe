'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const CandidateHistory = sequelize.define(
  'CandidateHistory',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dni: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    party: { type: DataTypes.STRING, allowNull: false },
    partyCode: { type: DataTypes.STRING, allowNull: false },
    current_votes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    previous_votes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    current_percent: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    trend: {
      type: DataTypes.ENUM('UP', 'DOWN', 'EQUAL'),
      allowNull: false,
      defaultValue: 'EQUAL',
    },
    last_updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'candidates_history',
    indexes: [{ unique: true, fields: ['dni'] }],
  }
);

module.exports = CandidateHistory;
