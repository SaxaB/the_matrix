# apps/client/web — dashboard web

Next.js 16 (App Router) portado de FinAI: shell (layout, navbar, auth, i18n es/en)
+ sección Finanzas (dashboard, portfolio, stocks, analysis, perfil/encuesta, onboarding).

## Cambios del trasplante (FinAI → the_matrix)

- **Auth contra GoTrue self-host** vía Kong (`NEXT_PUBLIC_SUPABASE_URL` → Kong local/tunnel),
  mismo `@supabase/ssr`. Sin Supabase cloud ni Vercel.
- **Schemas por dominio**: todas las queries usan `.schema("finance")` (cartera, perfil)
  o `.schema("market")` (datos de mercado). Tipos desde `@matrix/db/types`
  (`src/lib/supabase/database.types.ts` queda como shim).
- **Reutilización del ETL**: `ensureMarketDataForTicker` y `isUsListedInSecUniverse` se
  importan de `@matrix/etl` (workspace), no hay copia local de `lib/etl`.
- **Branding**: FinAI → Matrix en copy/UI; los identificadores `finai_risk_*` se conservan
  (columnas de BD y nombre del modelo heurístico).
- `output: "standalone"` para la imagen Docker (multi-stage, contexto raíz del monorepo).

## Desarrollo

```sh
pnpm install              # en la raíz del monorepo
cd apps/client/web
pnpm dev                  # http://localhost:3000 (requiere stack compose levantado)
pnpm typecheck && pnpm build
```

Env (ver `.env.example` raíz): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
server-side además `SUPABASE_URL`, `SERVICE_ROLE_KEY`, `SEC_EDGAR_USER_AGENT`;
opcionales `ALPHA_VANTAGE_API_KEY` (quotes en vivo), `ANTHROPIC_API_KEY` (informes IA).

## Deuda consciente del port (se aborda en fases posteriores)

- **Extracción de `sections/` y `shared/`** (diseño §12): se hará en F4 cuando exista el
  segundo consumidor (app móvil Expo); extraer ahora sería abstracción sin contraste.
- **Shell multi-dominio**: la navbar es la de finanzas; el switcher de dominios llega
  cuando haya un segundo dominio (F8).
- `middleware.ts` usa la convención deprecada de Next 16 (aviso de build); migrar a `proxy`
  en una pasada menor.
- Realtime (repintado en vivo) se cablea en F3, cuando el agente escriba en Postgres.

## Pendiente de validación (sin EQR6)

Typecheck y `next build` pasan; el flujo completo (login GoTrue, datos reales, Docker)
queda para el smoke test F0+F1+F2.
