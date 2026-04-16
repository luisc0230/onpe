'use strict';

const axios = require('axios');
const env = require('../config/env');

// CloudFront + nginx in front of ONPE returns the SPA's index.html to non-browser
// requests. We must send realistic browser headers (Referer, UA, sec-fetch-*) so
// the API actually returns JSON.
const http = axios.create({
  baseURL: env.onpe.base,
  timeout: 15000,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-ES,es;q=0.9',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'Referer': 'https://resultadoelectoral.onpe.gob.pe/main/resumen',
    'Origin': 'https://resultadoelectoral.onpe.gob.pe',
    'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  },
});

const query = {
  idEleccion: env.onpe.idEleccion,
  tipoFiltro: env.onpe.tipoFiltro,
};

const padPartyCode = (code) => String(code ?? '').padStart(8, '0');

const photoUrl = (dni) =>
  `https://resultadoelectoral.onpe.gob.pe/assets/img-reales/candidatos/${dni}.jpg`;

const logoUrl = (code) =>
  `https://resultadoelectoral.onpe.gob.pe/assets/img-reales/partidos/${padPartyCode(code)}.jpg`;

/**
 * Formats a Unix-ms integer as the exact banner expected by the spec:
 *   "16/04/2026 A LAS 12:25:00 p. m."
 * Uses Lima timezone to match ONPE's published values.
 */
function formatBannerTimestamp(ms) {
  if (!Number.isFinite(Number(ms))) return null;
  const d = new Date(Number(ms));
  const parts = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(d);

  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  const day = get('day');
  const month = get('month');
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');
  const dayPeriod = (get('dayPeriod') || '').toLowerCase().replace(/\./g, '');
  const suffix = dayPeriod.includes('p') ? 'p. m.' : 'a. m.';
  return `${day}/${month}/${year} A LAS ${hour}:${minute}:${second} ${suffix}`;
}

/**
 * GET /resumen-general/totales
 * Payload shape (as of 2026):
 *   { success, message, data: { actasContabilizadas, fechaActualizacion (Unix ms), ... } }
 */
async function fetchTotales() {
  const { data: payload } = await http.get('/resumen-general/totales', { params: query });
  const body = payload?.data || {};

  return {
    raw: payload,
    timestamp: formatBannerTimestamp(body.fechaActualizacion),
    timestampMs: body.fechaActualizacion ?? null,
    actasPercent: body.actasContabilizadas != null ? Number(body.actasContabilizadas) : null,
    totalActas: body.totalActas ?? null,
    contabilizadas: body.contabilizadas ?? null,
    participacionCiudadana: body.participacionCiudadana ?? null,
    totalVotosEmitidos: body.totalVotosEmitidos ?? null,
    totalVotosValidos: body.totalVotosValidos ?? null,
  };
}

/**
 * Normalizes participantes payload into the contract required by the UI and diff engine.
 * Schema mapping follows onpe_payload_mapping.endpoint_2_participantes.schema_to_map.
 * Real payload shape: { success, message, data: [ { nombreCandidato, ... }, ... ] }.
 */
function normalizeParticipantes(payload) {
  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
    ? payload
    : [];

  return list
    .map((c) => {
      const partyCodeRaw = c.codigoAgrupacionPolitica ?? c.codigoAgrupacion ?? '';
      const partyCodePadded = padPartyCode(partyCodeRaw);
      const dni = String(c.dniCandidato ?? '').trim();
      return {
        dni,
        name: String(c.nombreCandidato ?? '').trim(),
        party: String(c.nombreAgrupacionPolitica ?? '').trim(),
        partyCode: partyCodePadded,
        totalVotosValidos: Number(c.totalVotosValidos ?? 0),
        porcentajeVotosValidos: Number(c.porcentajeVotosValidos ?? 0),
        porcentajeVotosEmitidos: Number(c.porcentajeVotosEmitidos ?? 0),
        photoUrl: dni ? photoUrl(dni) : null,
        logoUrl: logoUrl(partyCodeRaw),
      };
    })
    .filter((c) => c.dni);
}

async function fetchParticipantes() {
  const { data } = await http.get('/resumen-general/participantes', { params: query });
  return { raw: data, candidates: normalizeParticipantes(data) };
}

module.exports = {
  fetchTotales,
  fetchParticipantes,
  padPartyCode,
  photoUrl,
  logoUrl,
};
