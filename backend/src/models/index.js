'use strict';

const { sequelize } = require('../db');
const CandidateHistory = require('./CandidateHistory');
const CandidateSnapshot = require('./CandidateSnapshot');
const Subscriber = require('./Subscriber');
const Preference = require('./Preference');

async function initModels() {
  await sequelize.authenticate();
  // sync without alter — tables already exist in MySQL
  await sequelize.sync({ alter: false });
}

module.exports = {
  sequelize,
  CandidateHistory,
  CandidateSnapshot,
  Subscriber,
  Preference,
  initModels,
};
