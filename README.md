# ONPE 2026 · Election Live Monitor

Real-time dashboard for the 2026 Peruvian Elections with subscription-based email alerts.
Strictly data-driven: **no hardcoded candidates, names, votes, or timestamps** — everything is mapped dynamically from the ONPE public endpoints.

## Architecture

```
elecciones/
├── backend/              Node.js + Express + Sequelize (SQLite) + node-cron + Nodemailer
│   └── src/
│       ├── config/env.js           Env loader
│       ├── db/index.js             Sequelize instance (SQLite)
│       ├── models/                 CandidateHistory, Subscriber, Preference
│       ├── services/
│       │   ├── onpe.service.js     Fetch + normalize ONPE payloads (totales + participantes)
│       │   ├── diff.service.js     UP / DOWN / EQUAL diff engine
│       │   ├── mailer.service.js   Nodemailer + BCC chunking (max 99)
│       │   └── poller.service.js   Cron-driven cycle orchestrator
│       ├── routes/                 /api/election, /api/subscription
│       ├── app.js                  Express app factory
│       └── server.js               Boot + cron scheduler
└── frontend/             Vite + React + Tailwind + Framer Motion
    └── src/
        ├── hooks/useElectionData.js   Custom hook owning snapshot lifecycle
        ├── components/                Header, ResultsTable, SubscriptionModal, …
        ├── lib/api.js, format.js
        └── App.jsx
```

## ONPE Payload Mapping

Exactly follows the spec:

| Field (ONPE) | UI mapping |
|---|---|
| `nombreAgrupacionPolitica` | Party name |
| `codigoAgrupacionPolitica` | `String(code).padStart(8, '0')` → logo URL |
| `nombreCandidato` | Candidate name |
| `dniCandidato` | Photo URL |
| `totalVotosValidos` | Primary comparison metric (sort DESC) |
| `porcentajeVotosValidos` | % valid |
| `porcentajeVotosEmitidos` | % emitted |

- Photo: `https://resultadoelectoral.onpe.gob.pe/assets/img-reales/candidatos/{dniCandidato}.jpg`
- Logo:  `https://resultadoelectoral.onpe.gob.pe/assets/img-reales/partidos/{codigoAgrupacionPolitica_padded}.jpg`
- Timestamp banner `ACTUALIZADO AL ...` and `actas contabilizadas %` pulled from `/resumen-general/totales`.

## Diff Algorithm

Implemented in `backend/src/services/diff.service.js`:

1. Fetch participantes.
2. For each candidate, compare `V_new = totalVotosValidos` vs stored `current_votes` (`V_old`).
3. `V_new > V_old` → **UP**; `V_new < V_old` → **DOWN** (critical log); `V_new == V_old` → **EQUAL** (no alert).
4. Update `previous_votes ← old current_votes`, `current_votes ← V_new`, `trend`, `last_updated`.

## Mailing Algorithm (BCC Chunking)

`backend/src/services/mailer.service.js`:

- Resolves recipients by intersecting triggered DNIs with each subscriber's `Preferences`.
- Subscribers with **no preferences / NULL preference** default to the **Top 5** by `totalVotosValidos`.
- Recipient array is chunked with `MAIL_BCC_CHUNK=99` and sent via `Promise.allSettled` (Gmail-safe).
- `to` is always `SMTP_USER`; real recipients go in `bcc`.

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev           # or: npm start
```

By default:
- SQLite DB at `backend/data/onpe.sqlite`
- API on `http://localhost:4000`
- Cron poll every 7 minutes
- `MAIL_DRY_RUN=true` → emails are logged, not sent. Set `false` and configure Gmail App Password to enable real delivery.

One-shot poll (useful for cron external scheduling):
```bash
npm run poll:once
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite dev server on `http://localhost:5173`, proxying `/api` → backend.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness |
| GET | `/api/election/snapshot` | Latest normalized snapshot (timestamp, actasPercent, candidates[]) |
| GET | `/api/election/candidates` | Persisted history rows |
| POST | `/api/election/refresh` | Force a poll cycle |
| POST | `/api/subscription/subscribe` | `{ email, candidateDnis?: string[] }` — empty = Top 5 default |
| DELETE | `/api/subscription/unsubscribe` | `{ email }` |

## UI / UX

- Mobile-first Tailwind, `sm`→`xl` breakpoints.
- Cards on mobile, full table from `md` onward.
- Framer Motion `layout` for row re-ordering + staggered fade-in.
- Row styling per trend:
  - UP: `text-green-700 bg-green-50/40` + ▲
  - DOWN: `text-red-700 font-bold bg-red-50` + ▼
  - EQUAL: `text-slate-800`
- Candidate / party images load directly from ONPE with `onError` graceful fallback (initials).
- Subscription modal: `backdrop-blur-md fixed inset-0 z-50`, multi-select, "Use Top 5" default toggle.

## Environment Variables

See `backend/.env.example`. **Never hardcode SMTP credentials**; use a Gmail App Password.

## Deploy a producción

### Backend → Render.com

1. **New → Web Service**, conecta tu repo de GitHub.
2. Configuración clave:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Health Check Path:** `/api/health`
3. **Environment Variables** (Dashboard → Environment):
   | Clave | Valor |
   |---|---|
   | `DATABASE_URL` | Tu cadena de Neon (`postgresql://...sslmode=require`) |
   | `SMTP_USER` | Tu Gmail |
   | `SMTP_APP_PASSWORD` | [App Password de Gmail](https://myaccount.google.com/apppasswords) |
   | `MAIL_DRY_RUN` | `false` |
   | `CORS_ORIGIN` | `*` inicialmente, luego la URL de Vercel |
   | `POLL_CRON` | `*/5 * * * *` |
   | `NODE_ENV` | `production` |
4. Render te dará una URL como `https://onpe-2026-backend.onrender.com`. Guárdala.

> Alternativa: el repo incluye `backend/render.yaml` (Blueprint) — puedes importarlo con **New → Blueprint** y sólo completar los `sync: false`.

> ⚠️ En el plan Free, Render duerme el servicio tras 15 min sin tráfico. El primer request tarda ~30 s en despertar. Considera el plan Starter si quieres que el cron siga corriendo siempre.

### Frontend → Vercel.com

1. **Add New Project** → importa el mismo repo.
2. Vercel detecta Vite automáticamente.
3. Configuración:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (por defecto)
   - **Output Directory:** `dist` (por defecto)
4. **Environment Variables:**
   | Clave | Valor |
   |---|---|
   | `VITE_API_URL` | URL de Render, sin `/api` y sin slash final. Ej: `https://onpe-2026-backend.onrender.com` |
5. Deploy. Vercel te dará una URL tipo `https://elecciones-peru.vercel.app`.
6. **Vuelve a Render** y actualiza `CORS_ORIGIN` a esa URL exacta para bloquear orígenes ajenos.

## Funcionalidades destacadas

- **Podio 2-1-3** animado con Framer Motion (medallas oro/plata/bronce).
- **Historial por candidato:** cada click abre un modal con gráfico sparkline SVG interactivo (tooltip al pasar el mouse / touch) + tabla completa de todas las actualizaciones con deltas.
- **Snapshots append-only** en tabla `candidate_snapshots` (dedupe por `upstream_ts_ms` para no duplicar cuando CloudFront sirve la misma respuesta cacheada).
- **Auto-refresh cada 2 min** en el cliente; cron del backend cada 5–7 min.
- **CTA prominente** con gradient + glow para maximizar conversión a suscripción.
- **Alertas email** con BCC chunking (≤99 por mensaje) y Promise.allSettled para resistir rate-limits de Gmail.

## License

MIT
