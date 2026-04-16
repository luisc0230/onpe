'use strict';

const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const electionRoutes = require('./routes/election.routes');
const subscriptionRoutes = require('./routes/subscription.routes');

function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  app.use('/api/election', electionRoutes);
  app.use('/api/subscription', subscriptionRoutes);

  app.use((err, _req, res, _next) => {
    console.error('[ERR]', err);
    res.status(500).json({ error: 'Internal error' });
  });

  return app;
}

module.exports = { createApp };
