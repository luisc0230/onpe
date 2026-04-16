'use strict';

const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const electionRoutes = require('./routes/election.routes');
const subscriptionRoutes = require('./routes/subscription.routes');

function createApp() {
  const app = express();

  // CORS_ORIGIN soporta:
  //   "*"                                  → permite cualquier origen
  //   "https://a.com,https://b.com"        → lista exacta separada por comas
  //   "https://*.vercel.app"               → wildcard de subdominio (útil para previews)
  const rawOrigins = (env.corsOrigin || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const originMatchers = rawOrigins.map((entry) => {
    if (entry === '*') return () => true;
    if (entry.includes('*')) {
      const re = new RegExp(
        '^' + entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
      );
      return (origin) => re.test(origin);
    }
    return (origin) => origin === entry;
  });

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // curl, same-origin, health checks
        const ok = originMatchers.some((m) => m(origin));
        return ok ? cb(null, true) : cb(new Error(`Origin ${origin} no permitido por CORS`));
      },
      credentials: false,
    })
  );
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
