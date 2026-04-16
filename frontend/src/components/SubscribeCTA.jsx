import { motion } from 'framer-motion';

export default function SubscribeCTA({ onOpen, candidateCount = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-rose-600 to-brand-700 text-white p-6 sm:p-10 shadow-xl"
    >
      {/* Decorative glow */}
      <div
        aria-hidden
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-amber-300/20 blur-3xl"
      />

      <div className="relative grid md:grid-cols-[1.2fr_auto] gap-6 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold tracking-wider">
            🔔 ALERTAS EN TIEMPO REAL
          </div>
          <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-tight">
            Entérate al instante cuando cambien los votos
          </h3>
          <p className="mt-2 text-white/85 text-sm sm:text-base max-w-xl">
            Recibe un correo cada vez que tu candidato suba o baje. Sigue a los que te importan —
            o deja el Top 5 por defecto. Sin spam, solo cuando hay movimientos reales.
          </p>

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/90">
            <li className="flex items-center gap-2">
              <span>✅</span> Datos oficiales ONPE
            </li>
            <li className="flex items-center gap-2">
              <span>⚡</span> Auto-refresh cada 2 min
            </li>
            <li className="flex items-center gap-2">
              <span>📧</span> {candidateCount} candidatos disponibles
            </li>
          </ul>
        </div>

        <div className="flex md:flex-col gap-3 md:items-stretch">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpen}
            className="flex-1 md:flex-none rounded-2xl bg-white text-brand-700 font-extrabold px-6 py-4 text-base sm:text-lg shadow-lg hover:shadow-2xl transition"
          >
            Suscribirme gratis →
          </motion.button>
          <button
            onClick={onOpen}
            className="flex-1 md:flex-none rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/30 px-4 py-3 text-sm font-semibold hover:bg-white/20 transition"
          >
            Elegir candidatos
          </button>
        </div>
      </div>
    </motion.section>
  );
}
