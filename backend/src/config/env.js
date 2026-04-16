'use strict';

require('dotenv').config();

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return String(v).toLowerCase() === 'true';
};

const int = (v, def) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

const env = {
  port: int(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  databaseUrl: process.env.DATABASE_URL || '',

  onpe: {
    base: process.env.ONPE_BASE || 'https://resultadoelectoral.onpe.gob.pe/presentacion-backend',
    idEleccion: process.env.ONPE_ID_ELECCION || '10',
    tipoFiltro: process.env.ONPE_TIPO_FILTRO || 'eleccion',
  },

  poll: {
    cron: process.env.POLL_CRON || '*/7 * * * *',
    onBoot: bool(process.env.POLL_ON_BOOT, true),
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: int(process.env.SMTP_PORT, 465),
    secure: bool(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_APP_PASSWORD || '',
    fromName: process.env.MAIL_FROM_NAME || 'ONPE 2026 Monitor',
    bccChunk: int(process.env.MAIL_BCC_CHUNK, 99),
    dryRun: bool(process.env.MAIL_DRY_RUN, true),
  },
};

module.exports = env;
