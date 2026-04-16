'use strict';

const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const env = require('../config/env');
const { Subscriber, Preference } = require('../models');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function renderHtml({ timestamp, actasPercent, triggered, topCandidates }) {
  const rows = triggered
    .map((c) => {
      const arrow = c.trend === 'UP' ? '▲' : '▼';
      const color = c.trend === 'UP' ? '#16a34a' : '#dc2626';
      const delta = Number(c.current_votes) - Number(c.previous_votes);
      const deltaFmt = (delta >= 0 ? '+' : '') + delta.toLocaleString('es-PE');
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;">
            <strong>${c.name}</strong><br/>
            <span style="color:#666;font-size:12px;">${c.party}</span>
          </td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums;">
            ${Number(c.current_votes).toLocaleString('es-PE')}
          </td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;color:${color};font-weight:bold;">
            ${arrow} ${deltaFmt}
          </td>
        </tr>`;
    })
    .join('');

  const top = (topCandidates || [])
    .slice(0, 5)
    .map(
      (c, i) =>
        `<li style="margin:4px 0;"><strong>${i + 1}. ${c.name}</strong> — ${Number(
          c.current_votes
        ).toLocaleString('es-PE')} (${Number(c.current_percent ?? 0).toFixed(2)}%)</li>`
    )
    .join('');

  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;color:#111;">
    <h2 style="margin:0 0 6px;">Elecciones 2026 · Actualización</h2>
    <p style="color:#555;margin:0 0 16px;">
      ${timestamp || 'Actualización en vivo'} ·
      Actas contabilizadas: <strong>${actasPercent != null ? actasPercent.toFixed(4) + '%' : '—'}</strong>
    </p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f7f7f8;">
          <th style="text-align:left;padding:10px;">Candidato</th>
          <th style="text-align:right;padding:10px;">Votos</th>
          <th style="text-align:right;padding:10px;">Cambio</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="3" style="padding:10px;color:#777;">Sin cambios.</td></tr>'}</tbody>
    </table>
    ${
      top
        ? `<h3 style="margin:20px 0 6px;">Top 5 actual</h3><ul style="padding-left:18px;">${top}</ul>`
        : ''
    }
    <p style="color:#888;font-size:12px;margin-top:24px;">
      Recibes este correo porque estás suscrito al Monitor Elecciones 2026.
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:18px 0;"/>
    <p style="color:#999;font-size:11px;text-align:center;margin:0;">
      Creado por <strong style="color:#555;">LDX Software</strong> ·
      <a href="mailto:gerencia@ldxsoftware.com.pe" style="color:#999;text-decoration:none;">gerencia@ldxsoftware.com.pe</a>
    </p>
  </div>`;
}

/**
 * Resolves which subscribers should receive an email and groups them by identical preferences.
 * Returns a Map where key = candidateDNIs signature, value = { emails: [], candidates: [] }.
 * This allows sending one BCC email per preference group instead of individual emails.
 */
async function resolveRecipients({ triggered, allCandidatesSorted }) {
  if (!triggered.length) return new Map();

  const triggeredDnis = new Set(triggered.map((c) => c.dni));
  const triggeredByDni = Object.fromEntries(triggered.map((c) => [c.dni, c]));
  const top5Dnis = new Set(allCandidatesSorted.slice(0, 5).map((c) => c.dni));

  const subs = await Subscriber.findAll({
    include: [{ model: Preference, as: 'preferences' }],
  });

  // Group users by their relevant triggered candidates
  const groups = new Map();

  for (const s of subs) {
    const prefs = s.preferences || [];
    const hasDefault = prefs.length === 0 || prefs.some((p) => p.candidate_dni == null);
    const explicit = prefs.map((p) => p.candidate_dni).filter(Boolean);

    let relevantCandidates = [];

    if (hasDefault) {
      // Default: show triggered candidates that are in TOP 5
      relevantCandidates = [...top5Dnis]
        .filter((dni) => triggeredDnis.has(dni))
        .map((dni) => triggeredByDni[dni]);
    } else if (explicit.length > 0) {
      // Custom: show only triggered candidates that user follows
      relevantCandidates = explicit
        .filter((dni) => triggeredDnis.has(dni))
        .map((dni) => triggeredByDni[dni]);
    }

    if (relevantCandidates.length > 0) {
      // Create a signature from DNIs to group users with identical preferences
      const signature = relevantCandidates.map((c) => c.dni).sort().join(',');
      if (!groups.has(signature)) {
        groups.set(signature, { emails: [], candidates: relevantCandidates });
      }
      groups.get(signature).emails.push(s.email);
    }
  }

  return groups;
}

async function sendBatchedAlert({ timestamp, actasPercent, triggered, allCandidatesSorted }) {
  const groups = await resolveRecipients({ triggered, allCandidatesSorted });
  if (groups.size === 0) {
    console.log('[MAIL] No recipients matched triggered candidates. Skipping.');
    return { chunks: 0, total: 0 };
  }

  // Flatten groups into chunks of max 99 emails per BCC (SMTP limit)
  const emailTasks = [];
  for (const { emails, candidates } of groups.values()) {
    const html = renderHtml({
      timestamp,
      actasPercent,
      triggered: candidates, // Personalized per preference group
      topCandidates: allCandidatesSorted,
    });

    // Split emails into chunks of 99 (BCC limit)
    const chunks = chunk(emails, 99);
    for (const bcc of chunks) {
      emailTasks.push({ bcc, html });
    }
  }

  const totalRecipients = [...groups.values()].reduce((sum, g) => sum + g.emails.length, 0);

  if (env.smtp.dryRun) {
    console.log(
      `[MAIL][DRY_RUN] Would send ${emailTasks.length} BCC email(s) to ${totalRecipients} recipient(s) across ${groups.size} preference group(s).`
    );
    return { chunks: emailTasks.length, total: totalRecipients, groups: groups.size, dryRun: true };
  }

  const t = getTransporter();
  const from = `"${env.smtp.fromName}" <${env.smtp.user}>`;
  const subject = 'Elecciones 2026 · Actualización de votos';

  // Send emails in batches (queued if > 99 per group)
  const results = await Promise.allSettled(
    emailTasks.map(({ bcc, html }) =>
      t.sendMail({ from, to: env.smtp.user, bcc, subject, html })
    )
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) console.error(`[MAIL] ${failed.length} chunk(s) failed`, failed);

  console.log(
    `[MAIL] Sent ${emailTasks.length} BCC email(s) to ${totalRecipients} recipient(s) across ${groups.size} preference group(s). Failed: ${failed.length}`
  );

  return {
    chunks: emailTasks.length,
    total: totalRecipients,
    groups: groups.size,
    failed: failed.length,
  };
}

async function verifyTransport() {
  if (env.smtp.dryRun) return { ok: true, dryRun: true };
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { sendBatchedAlert, verifyTransport, resolveRecipients };
