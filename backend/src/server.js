'use strict';

const cron = require('node-cron');
const env = require('./config/env');
const { createApp } = require('./app');
const { initModels } = require('./models');
const { runPollCycle } = require('./services/poller.service');
const { verifyTransport } = require('./services/mailer.service');

async function main() {
  await initModels();
  console.log('[BOOT] Database ready.');

  const transport = await verifyTransport();
  console.log('[BOOT] SMTP:', transport);

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[BOOT] API listening on :${env.port} (${env.nodeEnv})`);
  });

  if (env.poll.onBoot) {
    runPollCycle().catch((e) => console.error('[BOOT] initial poll failed:', e.message));
  }

  if (cron.validate(env.poll.cron)) {
    cron.schedule(env.poll.cron, () => {
      runPollCycle().catch((e) => console.error('[CRON] poll failed:', e.message));
    });
    console.log(`[BOOT] Cron scheduled: ${env.poll.cron}`);
  } else {
    console.warn(`[BOOT] Invalid cron expression: ${env.poll.cron}`);
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
