'use strict';

const { Sequelize } = require('sequelize');
const env = require('../config/env');

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL no configurado. Define la cadena de conexión de Neon en .env');
}

// Neon PostgreSQL (serverless). sslmode=require is enforced via dialectOptions.
const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  pool: { max: 5, min: 0, idle: 10000, acquire: 30000 },
});

module.exports = { sequelize };
