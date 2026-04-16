'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { Subscriber, Preference, sequelize } = require('../models');

const router = Router();

const subscribeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const isEmail = (e) =>
  typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

router.post('/subscribe', subscribeLimiter, async (req, res) => {
  const { email, candidateDnis } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: 'Email inválido' });

  const normalized = email.trim().toLowerCase();
  const dnis = Array.isArray(candidateDnis)
    ? [...new Set(candidateDnis.map((d) => String(d).trim()).filter(Boolean))]
    : [];

  const t = await sequelize.transaction();
  try {
    const [sub] = await Subscriber.findOrCreate({
      where: { email: normalized },
      defaults: { email: normalized },
      transaction: t,
    });

    await Preference.destroy({ where: { subscriber_id: sub.id }, transaction: t });

    if (dnis.length === 0) {
      await Preference.create(
        { subscriber_id: sub.id, candidate_dni: null },
        { transaction: t }
      );
    } else {
      await Preference.bulkCreate(
        dnis.map((dni) => ({ subscriber_id: sub.id, candidate_dni: dni })),
        { transaction: t }
      );
    }

    await t.commit();
    res.json({
      ok: true,
      subscriber: { id: sub.id, email: sub.email },
      tracking: dnis.length ? dnis : 'TOP_5_DEFAULT',
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
});

router.delete('/unsubscribe', async (req, res) => {
  const { email } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: 'Email inválido' });
  const removed = await Subscriber.destroy({ where: { email: email.trim().toLowerCase() } });
  res.json({ ok: true, removed });
});

module.exports = router;
