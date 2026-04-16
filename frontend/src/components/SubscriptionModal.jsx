import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { subscribe, sendTestEmail } from '../lib/api';
import CandidateImage from './CandidateImage';

export default function SubscriptionModal({ open, onClose, candidates }) {
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [useDefault, setUseDefault] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const sorted = useMemo(
    () => [...(candidates || [])].sort((a, b) => b.totalVotosValidos - a.totalVotosValidos),
    [candidates]
  );
  const top5 = useMemo(() => sorted.slice(0, 5), [sorted]);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setSelected(new Set());
      setUseDefault(true);
      setResult(null);
      setError(null);
    }
  }, [open]);

  const toggle = (dni) => {
    setUseDefault(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dni)) next.delete(dni);
      else next.add(dni);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const dnis = useDefault ? [] : Array.from(selected);
      const res = await subscribe(email.trim(), dnis);
      // Wait for DB commit, then send confirmation email with fresh preferences.
      // Small delay ensures the transaction is fully committed before reading.
      await new Promise((r) => setTimeout(r, 300));
      sendTestEmail(email.trim())
        .then(() => setResult({ ...res, emailSent: true }))
        .catch(() => setResult({ ...res, emailSent: false }));
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-md bg-slate-900/40 p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Suscríbete a alertas</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recibe un correo cuando tus candidatos cambien de votos.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-full w-8 h-8 grid place-items-center hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {result ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="font-bold text-lg">¡Suscripción confirmada!</p>
                <p className="text-sm text-slate-600 mt-2">
                  Enviamos un correo de <strong>confirmación</strong> a <strong>{email}</strong>.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Si no lo ves en bandeja de entrada en 1–2 min, revisa Spam o Promociones.
                </p>
                <div className="mt-4 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 text-left">
                  <div className="text-[11px] font-bold tracking-wider text-slate-500 mb-1">
                    {result.mode === 'CUSTOM' ? 'CANDIDATOS SELECCIONADOS' : 'TOP 5 AUTOMÁTICO'}
                  </div>
                  {Array.isArray(result.tracking) && result.tracking.length > 0 ? (
                    <ul className="space-y-1 text-xs">
                      {result.tracking.map((c, i) => (
                        <li key={c.dni || i} className="flex items-start gap-1.5">
                          <span className="text-slate-400 shrink-0">{i + 1}.</span>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{c.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">{c.party}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm">
                      Top 5 automático (los 5 más votados en cada actualización)
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200">
                    Recibirás correos <strong>solo cuando cambien los votos</strong> entre dos
                    actualizaciones. No hay spam.
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="mt-5 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-800"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Correo electrónico</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tunombre@correo.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Candidatos a seguir</span>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={useDefault}
                        onChange={(e) => {
                          setUseDefault(e.target.checked);
                          if (e.target.checked) setSelected(new Set());
                        }}
                      />
                      Usar Top 5 por defecto
                    </label>
                  </div>

                  <div className="mt-2 max-h-64 overflow-y-auto rounded-xl ring-1 ring-slate-200 divide-y divide-slate-100">
                    {(useDefault ? top5 : sorted).map((c) => {
                      const checked = useDefault ? true : selected.has(c.dni);
                      return (
                        <label
                          key={c.dni}
                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 ${
                            useDefault ? 'opacity-90 pointer-events-none' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(c.dni)}
                            disabled={useDefault}
                          />
                          <CandidateImage src={c.photoUrl} alt={c.name} size={28} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{c.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{c.party}</div>
                          </div>
                        </label>
                      );
                    })}
                    {!sorted.length && (
                      <div className="p-3 text-xs text-slate-500">Sin candidatos aún.</div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-600 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
                  >
                    {submitting ? 'Enviando…' : 'Suscribirme'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
