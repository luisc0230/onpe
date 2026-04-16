import ldxLogo from '../images/LOGOS.png';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-8 border-t border-slate-200 bg-white/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <a
          href="mailto:gerencia@ldxsoftware.com.pe"
          className="flex items-center gap-3 group"
          aria-label="Creado por LDX Software"
        >
          <img
            src={ldxLogo}
            alt="LDX Software"
            className="h-9 w-auto object-contain"
          />
          <div className="leading-tight">
            <div className="text-[10px] font-bold tracking-[0.18em] text-slate-400">
              CREADO POR
            </div>
            <div className="text-sm font-bold text-slate-800 group-hover:text-brand-600 transition">
              LDX Software
            </div>
            <div className="text-[11px] text-slate-500">gerencia@ldxsoftware.com.pe</div>
          </div>
        </a>

        <div className="text-center sm:text-right text-[11px] text-slate-500 max-w-sm">
          <div>
            Datos oficiales:{' '}
            <a
              href="https://resultadoelectoral.onpe.gob.pe/main/resumen"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-700"
            >
              resultadoelectoral.onpe.gob.pe
            </a>
          </div>
          <div>Este proyecto no está afiliado a la ONPE.</div>
          <div className="mt-1 text-slate-400">© {year} LDX Software · Todos los derechos reservados</div>
        </div>
      </div>
    </footer>
  );
}
