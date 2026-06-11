# FinAI — contexto de proyecto (handoff)

Resumen para retomar el trabajo en otra sesión. Detalle de convenciones: **AGENTS.md**. Esquema Supabase y ETL: **supabase/README.md**.

## Qué es

App **Next.js 16** (App Router) en **español**: perfil de riesgo, cartera, análisis de brecha, ficha de valores. **No hay chat de IA en la UI**; **Claude (Anthropic)** (si está configurada la API key) se usa solo en **servidor** al completar onboarding o al guardar la encuesta; en `/perfil` solo se muestra el texto (sin botón que dispare la API).

## Stack relevante

- **Supabase** (Auth + Postgres): `user_profiles`, `holdings`, tablas de mercado (`us_symbols`, `sec_*`, `yahoo_*`, etc. según migraciones).
- **Mercado**: ingestión por scripts en `scripts/etl/` (`sec-edgar-ingest`, `yahoo-ingest`, `preload-indices`) con helpers en `src/lib/etl/`. Variables: `SUPABASE_SERVICE_ROLE_KEY`, `SEC_EDGAR_USER_AGENT`; opcional backfill al añadir holdings (`ensureMarketDataForTicker`).
- **Dev**: `npm run dev` usa **Webpack** (`--webpack`); `npm run dev:turbo` para Turbopack.

## Rutas y auth

- Público sin sesión: `/`, `/login`, `/signup`, `/auth/*`, `/api/*`.
- Con sesión pero **sin** cuestionario completado: redirige a `/onboarding` si entra en dashboard, portfolio, analysis, stocks, `/perfil`, `/ajustes`.
- Con perfil: `/onboarding` redirige a `/dashboard`; edición del cuestionario en **`/perfil/encuesta`**.
- Logout: acción servidor **`signOutUser`** (navbar).

## Dominio de cartera

- Clases de activo incl. **cash**; efectivo persistido como ticker sintético **`CASH-{CCY}`**.
- **`sellHoldingToCash`**: venta parcial o total; incrementa/crea la posición de efectivo en esa divisa.
- **`deleteHolding`**: eliminar posición sin lógica de “venta a cash”.

## Documentación en repo

| Archivo | Contenido |
|---------|-----------|
| **AGENTS.md** | Stack, estructura `src/`, convenciones UI, lista de acciones servidor, comandos |
| **README.md** | Quick start, variables, tabla de scripts npm |
| **supabase/README.md** | Setup Supabase, migraciones, **sección 8 — ETL SEC + Yahoo** (comandos, universe `indices`, cadencia) |
| **TODO.md** | Pendientes e ideas |
| **PROJECT_CONTEXT.md** | Este handoff corto |

## Comandos ETL (referencia rápida)

```bash
npm run etl:sec -- --sync-symbols          # mapa completo US → us_symbols
npm run etl:sec -- --universe indices      # company facts ~universo índices
npm run etl:yahoo -- --universe indices    # velas + snapshot Yahoo
npm run etl:preload-indices -- --dry-run   # precarga S&P ∪ Dow ∪ Nasdaq-100
```

## Archivos clave de código

- `src/lib/actions.ts` — holdings, perfil, venta a cash, sign out, mercado/backfill.
- `src/lib/supabase/middleware.ts` — sesión y reglas de onboarding.
- `src/app/portfolio/page.tsx` — formulario por tipo de activo, menú venta.
- `src/app/perfil/encuesta/page.tsx` — edición encuesta.
- `src/app/globals.css` + `components/ui/select.tsx`, `dropdown-menu.tsx` — paneles sólidos y hover en desplegables.

---

*Última sincronización: documentación alineada con eliminación del chat en UI, venta a efectivo, `/perfil/encuesta`, y ETL documentado en supabase/README.*
