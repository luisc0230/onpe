'use strict';

const { initModels } = require('../models');
const { runPollCycle } = require('../services/poller.service');

(async () => {
  await initModels();
  const snap = await runPollCycle();
  console.log(JSON.stringify({ timestamp: snap.timestamp, count: snap.candidates.length }, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
