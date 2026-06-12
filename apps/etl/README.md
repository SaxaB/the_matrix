# apps/etl — ETL de datos de mercado

Jobs TS que pueblan el schema `market` (contrato en `packages/db`). Trasplante de los
ETLs de FinAI (`scripts/etl/` + `src/lib/etl/`) con estos cambios:

- Sin GitHub Actions ni Supabase cloud: corre contra el stack self-host del compose.
- Cliente service_role apuntando a Kong (`SUPABASE_URL`) con schema por defecto `market`.
- Env: `.env` de la raíz del monorepo (o variables inyectadas por compose).
- Tipos desde `@matrix/db/types` (antes `database.types.ts` generado de FinAI).
- User-Agent SEC renombrado a `the_matrix/0.1`.

## Jobs

| Comando | Qué hace | Cadencia prevista (n8n) |
|---|---|---|
| `pnpm etl:preload` | Universo índices (S&P 500 ∪ Nasdaq-100 ∪ Dow): símbolos SEC + backfill Yahoo + métricas EDGAR | una vez (bootstrap) y bajo demanda |
| `pnpm etl:yahoo -- --universe indices` | Snapshot Yahoo + velas EOD incrementales | diario (tras cierre US) |
| `pnpm etl:risk` | `finai_risk_score` 5-95 determinista por ticker | diario, después de etl:yahoo |
| `pnpm etl:sec` | Métricas XBRL de SEC EDGAR (whitelist us-gaap) | semanal |

## Ejecutar

```sh
# Desde el host (necesita stack levantado y .env con SUPABASE_URL=http://localhost:8000):
pnpm install
pnpm --filter @matrix/etl etl:yahoo -- --symbols AAPL,MSFT

# En contenedor (contexto raíz; env inyectado por compose):
docker compose build etl
docker compose run --rm etl etl:yahoo -- --universe indices
```

Env requerido: `SUPABASE_URL`, `SERVICE_ROLE_KEY`, `SEC_EDGAR_USER_AGENT` (ver `.env.example`).

## Estructura

- `src/jobs/` — entrypoints CLI (antes `scripts/etl/` en FinAI)
- `src/lib/` — núcleo: `yahoo-ingest-core`, `sec-edgar-core`, `ticker-risk-score` (5-95),
  `index-universe`, `ensure-market-data` (en F3 se envolverá como endpoint HTTP interno)
- `src/db.ts` — cliente service_role (schema `market`)
- `src/env.ts` — carga de `.env` raíz

## Pendiente de validación (sin EQR6)

Typecheck pasa (`pnpm --filter @matrix/etl typecheck`); la ejecución real contra
Postgres + las APIs de SEC/Yahoo queda para el smoke test conjunto F0+F1.
