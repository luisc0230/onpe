'use strict';

const { sequelize } = require('../db');
const CandidateHistory = require('./CandidateHistory');
const CandidateSnapshot = require('./CandidateSnapshot');
const Subscriber = require('./Subscriber');
const Preference = require('./Preference');

async function initModels() {
  await sequelize.authenticate();
  await sequelize.sync();
}

module.exports = {
  sequelize,
  CandidateHistory,
  CandidateSnapshot,
  Subscriber,
  Preference,
  initModels,
};
