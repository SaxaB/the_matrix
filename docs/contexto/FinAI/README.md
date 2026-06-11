# FinAI

Aplicación web (**Next.js 16**, TypeScript) para que inversores particulares alineen su cartera con su perfil de riesgo. Interfaz en **español**.

## Requisitos

- **Node.js** 20+
- Cuenta **Supabase** (Postgres + Auth) si quieres datos y login reales

## Puesta en marcha

```bash
npm install
cp .env.example .env.local
# Edita .env.local con URL y anon key de Supabase (y opcional: service role, SEC user-agent, Anthropic para informe IA en /perfil)
```

Aplica el esquema en el proyecto Supabase (SQL Editor o migraciones en `supabase/migrations/`). Guía detallada: **[supabase/README.md](supabase/README.md)** (incluye **ETL SEC + Yahoo**: `npm run etl:sec`, `npm run etl:yahoo`, `npm run etl:preload-indices`).

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Por defecto el script usa **Webpack** (`next dev --webpack`); puedes usar `npm run dev:turbo` para Turbopack.

## Funcionalidades

- **Onboarding**: cuestionario de perfil de riesgo; edición posterior en **`/perfil/encuesta`**.
- **Dashboard**: resumen, gráficos, métricas.
- **Portafolio**: posiciones (incl. efectivo vía tickers `CASH-{divisa}`); ventas parciales/totales a efectivo.
- **Análisis**: brecha vs asignación objetivo.
- **Acciones**: cotización, fundamentales (SEC/Yahoo según datos cargados). El informe técnico de perfil en **`/perfil`** usa **Claude (Anthropic)** en servidor si configuras la API key (no hay chat flotante en la UI).

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (cliente + RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor: ETL, backfill de mercado, RPC administrativas |
| `SEC_EDGAR_USER_AGENT` | Identificador obligatorio para APIs de la SEC (ETL / backfill), p. ej. `MiApp/1.0 (contacto@email.com)` |
| `ANTHROPIC_API_KEY` | Opcional: informe IA de perfil en **servidor** (`/perfil`); no sustituye datos de mercado |

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (Webpack) |
| `npm run dev:turbo` | Servidor de desarrollo con Turbopack |
| `npm run build` | Compilación de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run etl:sec` | Ingesta SEC EDGAR (ver [supabase/README.md](supabase/README.md)) |
| `npm run etl:yahoo` | Ingesta Yahoo Finance (velas + snapshot) |
| `npm run etl:preload-indices` | Precarga universo índices (S&P 500, Dow, Nasdaq-100) |

## Documentación del agente / contexto

- **[AGENTS.md](./AGENTS.md)** — convenciones del repo, stack, estructura.
- **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** — resumen ejecutivo para continuidad entre sesiones.
- **[TODO.md](./TODO.md)** — pendientes e ideas.

## Licencia

Privado (según `package.json`).
