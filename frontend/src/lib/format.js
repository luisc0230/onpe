export const fmtInt = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-PE') : '—';

export const fmtPct = (n, digits = 2) =>
  Number.isFinite(Number(n)) ? `${Number(n).toFixed(digits)}%` : '—';

export const fallbackInitials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
