'use strict';

const { Sequelize } = require('sequelize');
const env = require('../config/env');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    charset: 'utf8mb4',
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
  },
  pool: { max: 5, min: 0, idle: 10000, acquire: 30000 },
});

module.exports = { sequelize };
