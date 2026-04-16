'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { Subscriber, Preference, sequelize } = require('../models');
const nodemailer = require('nodemailer');
const env = require('../config/env');
const { getLastSnapshot } = require('../services/poller.service');

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

/**
 * Status endpoint: verifies a given email is subscribed and returns which
 * candidates it's tracking, so the UI (and the user) can confirm the config.
 */
router.get('/status', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ error: 'Email inválido' });

  const sub = await Subscriber.findOne({ where: { email } });
  if (!sub) return res.json({ subscribed: false });

  const prefs = await Preference.findAll({ where: { subscriber_id: sub.id } });
  const dnis = prefs.map((p) => p.candidate_dni).filter(Boolean);
  const mode = dnis.length ? 'CUSTOM' : 'TOP_5_DEFAULT';

  // Enrich with candidate names from the latest snapshot.
  const snap = getLastSnapshot();
  const byDni = Object.fromEntries((snap.candidates || []).map((c) => [c.dni, c]));
  const tracking =
    mode === 'CUSTOM'
      ? dnis.map((dni) => ({ dni, name: byDni[dni]?.name || dni, party: byDni[dni]?.party || '—' }))
      : (snap.candidates || [])
          .slice(0, 5)
          .map((c) => ({ dni: c.dni, name: c.name, party: c.party }));

  res.json({
    subscribed: true,
    email: sub.email,
    createdAt: sub.created_at,
    mode,
    tracking,
  });
});

const testLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Sends a one-off confirmation/test email to a subscribed address so the user
 * can visually verify delivery works end-to-end (SMTP, templates, inbox).
 */
router.post('/test-email', testLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ error: 'Email inválido' });

  const sub = await Subscriber.findOne({ where: { email } });
  if (!sub) return res.status(404).json({ error: 'Email no suscrito' });

  const prefs = await Preference.findAll({ where: { subscriber_id: sub.id } });
  const dnis = prefs.map((p) => p.candidate_dni).filter(Boolean);
  const snap = getLastSnapshot();
  const byDni = Object.fromEntries((snap.candidates || []).map((c) => [c.dni, c]));
  const tracking = dnis.length
    ? dnis.map((d) => byDni[d]).filter(Boolean)
    : (snap.candidates || []).slice(0, 5);

  const list = tracking
    .map(
      (c, i) =>
        `<li style="margin:4px 0;"><strong>${i + 1}. ${c.name}</strong> — ${Number(
          c.totalVotosValidos || 0
        ).toLocaleString('es-PE')} votos (${Number(c.porcentajeVotosValidos || 0).toFixed(2)}%)</li>`
    )
    .join('');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;color:#111;">
      <h2 style="margin:0 0 8px;">✅ Suscripción confirmada</h2>
      <p style="color:#555;margin:0 0 16px;">
        Tu correo <strong>${sub.email}</strong> está correctamente registrado en
        <strong>Elecciones 2026 · Monitor en Vivo</strong>.
      </p>
      <p style="margin:0 0 8px;">Modo de seguimiento:
        <strong>${dnis.length ? 'Candidatos personalizados' : 'Top 5 automático'}</strong>
      </p>
      <p style="margin:0 0 6px;">Actualmente sigues a:</p>
      <ul style="padding-left:18px;margin:0 0 16px;">${list || '<li>Sin datos aún</li>'}</ul>
      <p style="color:#555;font-size:13px;">
        Recibirás un correo como este — con la tabla de cambios — únicamente cuando el
        sistema detecte variaciones reales de votos entre dos actualizaciones.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:18px 0;"/>
      <p style="color:#999;font-size:11px;text-align:center;margin:0;">
        Creado por <strong style="color:#555;">LDX Software</strong> ·
        <a href="mailto:gerencia@ldxsoftware.com.pe" style="color:#999;text-decoration:none;">gerencia@ldxsoftware.com.pe</a>
      </p>
    </div>`;

  if (env.smtp.dryRun) {
    console.log('[MAIL][DRY_RUN] test email to', sub.email);
    return res.json({ ok: true, dryRun: true });
  }

  try {
    const t = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
    await t.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: sub.email,
      subject: '✅ Suscripción confirmada · Elecciones 2026',
      html,
    });
    res.json({ ok: true, sentTo: sub.email });
  } catch (err) {
    console.error('[MAIL] test-email failed', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
