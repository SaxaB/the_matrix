# AGENTS.md — the_matrix

Guía para cualquier agente (o humano) que trabaje en este repo. Léela antes de tocar nada.

## Qué es este proyecto

**the_matrix** es un sistema unificado de agentes personales autoalojado en un Beelink EQR6
(Ubuntu + Docker). Un orquestador propio en Python — **saxa** (arquitectura Hermes) — coordina
11 dominios de agentes (P1 finanzas primero), con dashboard web + app móvil como clientes y
Telegram como canal. Todo sobre un único Postgres (Supabase self-hosted) con Realtime.

- **Espec canónica**: `docs/DISENO-SISTEMA-UNIFICADO.md` (visión, catálogo P1-P11, topología, fases F0-F9, decisiones). Ante cualquier duda de diseño, manda ese documento.
- **Plan operativo**: `docs/PLAN-CONSTRUCCION.md` (qué se trasplanta de cada repo fuente, qué se escribe nuevo, fases y riesgos).

## Repos fuente (minar, no copiar)

Este proyecto trasplanta código de dos repos vecinos. **Nunca se copian dentro de este repo**;
se leen desde sus rutas absolutas cuando haga falta extraer algo:

| Repo | Ruta | Qué se extrae |
|---|---|---|
| financial-freedom | `/Users/alexmarin/Code/financial-freedom` | Lógica de tools (`tools/scripts/`: dcf_manual, technical, finnhub_query, x_lists_fetch, valuation), gates (`source_gate`, `telegram_md_lint`), reglas duras de su `AGENTS.md` (constitución del dominio P1), `research_pipeline.py` como espec |
| FinAI | `/Users/alexmarin/Code/FinAI` | Esquema SQL de mercado (`supabase/`, 9 migraciones), ETLs SEC/Yahoo/risk (`scripts/etl/`, `src/lib/etl/`), `ticker-risk-score.ts`, UI de finanzas (`src/app/`) |

Documentación de contexto de ambos ya versionada en `docs/contexto/`.

## Decisiones que no se discuten (resumen de §11 del diseño)

1. Runtime propio (saxa/Hermes + APIs de modelo por token). Claude Code/Codex **solo para construir**, nunca como runtime.
2. Sin Ollama por ahora; APIs públicas con regla estricta de no enviar PII.
3. Todo self-hosted en el EQR6: Supabase self-host, nada de Supabase cloud / Vercel / GitHub Actions para runtime.
4. Monorepo (estructura en §12 del diseño): `apps/{client,agent,etl}`, `packages/db`, `infra/`, `evals/`.
5. `packages/db` es el contrato único de datos entre web (TS), agente (Python) y ETL (TS).
6. ETL de mercado en TS; escrituras del agente en Python; Postgres+Realtime de pegamento.

## Convenciones

- **Secrets**: jamás en git. `.env` (ignorado) + `.env.example` versionado como plantilla.
- **Idioma**: documentación y comunicación en español; código e identificadores en inglés.
- **Commits y push los hace el usuario**, salvo instrucción explícita en contrario.
- **No sobre-ingenierizar**: cada pieza con su gate y su eval; fases que entregan valor solas (F0-F2 ya dan un portal útil sin capa agéntica).
- Versiones de imágenes Docker **fijadas** en Compose (especialmente Supabase self-host).

## Estado

- 2026-06-11: bootstrap del repo (docs + plan).
- 2026-06-11: **F0 construido**: esqueleto del monorepo (§12) + `docker-compose.yml` con Supabase self-host (versiones fijadas, ver `infra/supabase/README.md`) + cloudflared bajo perfil `tunnel`. Compose validado en sintaxis; **pendiente smoke test real** (`docker compose up`) en local o en el EQR6.
- 2026-06-12: **F1 construido** (sin host aún, nada probado en vivo):
  - `packages/db`: esquema FinAI consolidado en migraciones `0001_init` (schemas por dominio `market`/`finance`/`util`, §14.4.3), `0002_market`, `0003_finance` + runner idempotente `apply.sh` + tipos TS en `types.ts` (paquete `@matrix/db`).
  - `apps/etl`: los 4 jobs de FinAI portados (`etl:preload|yahoo|risk|sec`) con su cierre de dependencias (~18 ficheros); cliente service_role contra Kong con schema `market`; sin GitHub Actions/Supabase cloud. Typecheck OK. Dockerfile one-shot (perfil `jobs` en compose).
  - Compose: servicios `etl` y `n8n` (1.123.55, solo LAN) añadidos; cadencias documentadas en `infra/n8n/README.md`. `PGRST_DB_SCHEMAS` ahora incluye `market,finance`.
  - Workspace pnpm raíz (`package.json` + `pnpm-workspace.yaml` + lockfile) y `CLAUDE.md` mínimo.
  - **Pendiente para cuando haya host (smoke test F0+F1)**: `docker compose up`, `apply.sh`, poblar universo (~500 tickers) con `etl:preload`, crear workflows n8n y decidir su disparador (socket Docker vs cron del host).
- 2026-06-12: **F2 construido** (sin pruebas en vivo):
  - `apps/client/web`: app FinAI completa portada (Next 16, 14 rutas, i18n es/en). Auth contra GoTrue self-host vía Kong; queries adaptadas a `.schema("finance"|"market")`; tipos desde `@matrix/db`; `ensureMarketDataForTicker`/`isUsListedInSecUniverse` reutilizados de `@matrix/etl`; branding FinAI→Matrix (los `finai_risk_*` se conservan). `typecheck` y `next build` (standalone) pasan.
  - Compose: servicio `web` (puerto 3000) añadido; `ALPHA_VANTAGE_API_KEY`/`ANTHROPIC_API_KEY` opcionales en `.env.example`. `0002_market` restaura escritura de `asset_quotes` para autenticados (caché de quotes desde server actions, patrón FinAI).
  - Deuda consciente (ver `apps/client/web/README.md`): extracción `sections/`+`shared/` pospuesta a F4 (segundo consumidor), navbar multi-dominio a F8, `middleware`→`proxy`, Realtime en F3.
- 2026-06-12: **F3 construido** (lo nuevo grande; sin pruebas en vivo):
  - `apps/agent`: paquete Python `saxa` — router de modelos (`infra/models.yaml`, cheap-first §5ter), presupuesto persistente (tarea + tope diario, `agent.llm_spend`), runner de loops con hard stops (`infra/loops.yaml`, §5quater), Hermes (intención→pipeline→síntesis→gates), gateway Telegram long polling con allowlist.
  - Dominio finance: Step 0 desde Postgres (no bitácora), clasificador keywords→LLM, research pipeline reescrito (espec: `research_pipeline.py`); fuentes sociales declaradas omitidas hasta F4 (REGLA #6). Tools: `technical` (sobre `yahoo_eod_bars`), `finnhub`.
  - Gates portados de financial-freedom: `source_gate`+`valuation_gate` (con `data/source-policy.yaml`) y `telegram_md_lint`. Autonomía L2 cableada en el system prompt y sin código de ejecución de órdenes.
  - `packages/db`: migración `0004_agent` (llm_spend, loop_runs, approvals). Compose: servicio `agent`. **26 tests pasan** (sin red ni BD): router, budget, loop, intent, gates, síntesis con gate-retry.
  - Pendiente en F3 para el smoke test: probar `saxa check`/`saxa briefing` contra stack real con API keys.
- 2026-06-12: **F4a (finanzas) construido** (sin pruebas en vivo):
  - Migración `0005_finance_portfolio`: `cash_balances`, `portfolio_operations`, `trade_plans` (estado draft→gated→published; publicar = humano, ámbar §8.2).
  - `portfolio` (§9bis.1): PnL abierto, exposición por sector, % cartera, R abierto contra el stop del plan publicado.
  - `risk_engine`+`risk_gate` (§9bis.2): modelo TradePlan pydantic + gate con reglas de `infra/risk-rules.yaml` — sizing por `finai_risk_score`, pérdida a SL acotada al NAV, entradas/TPs escalados con pesos=1.0, R calculado (rechaza R inventados), límites de cartera. Mismo patrón que source_gate: si no cumple, no se publica.
  - Fuentes sociales portadas e integradas al briefing: `reddit_retail` (JSON público), `x_stonks` (Apify, pool APIFY_KEYS), `citrini_substack` (Jina, pool JINA_KEYS). Solo `carpatos` queda omitida (F5). **37 tests pasan**.
- 2026-06-12: **F4b construido** — el árbol `apps/client/` converge con el diseño:
  - `apps/client/shared` (`@matrix/client-shared`): cliente Supabase multiplataforma (storage inyectable), atajos `financeDb`/`marketDb`, formatters extraídos de la web.
  - `apps/client/sections/finance` (`@matrix/section-finance`): queries supabase-js (portfolio, snapshot, trade plans + suscripción Realtime), mappers row→view-model, schemas Zod (TradePlan = espejo del pydantic §9bis.2).
  - `apps/client/mobile` (`@matrix/mobile`): Expo SDK 56 (RN 0.85.3), auth gate GoTrue, tabs Cartera / Trade plans (Realtime §4bis) / Ajustes; metro.config para monorepo pnpm. Consume solo shared+sections — cero lógica duplicada.
  - Typecheck pasa en los 3 paquetes; web y etl siguen compilando; 37 tests del agente OK. Convergencia restante (incremental): la web puede ir adoptando `section-finance` en client components.
  - Pendiente smoke test (EQR6): Expo Go contra GoTrue/PostgREST/Realtime reales; `npx expo install --fix` al primer arranque.
- 2026-06-12: **F5 construido** (sin pruebas en vivo):
  - Radar semanal (§9bis.3): migración `0006_radar` + `infra/radar-rules.yaml` + `saxa.domains.finance.radar` — scoring determinista sin LLM (técnico de `yahoo_eod_bars`, fundamental de `sec_edgar_metrics`, riesgo invertido, narrativa opcional), filtros de universo, top N con trade plan preliminar validado por risk_gate y persistido. CLI `saxa radar` (n8n: domingo).
  - Grafo de decisión (§9bis.4) en LangGraph: `market_data→historical_context→risk_sizing→tax_impact→synthesis→human_approval` con **interrupt rojo** antes de aprobar; aprobaciones en `agent.approvals`; resume con decisión humana publica o rechaza el plan. Comandos Telegram `/decidir`, `/planes`, `/aprobar`, `/rechazar`.
  - `carpatos` portado (yt-dlp, transcript del último vídeo del canal): el briefing ya no tiene fuentes pendientes; cualquier fallo se declara omitido.
  - **45 tests pasan** (radar determinista, plan preliminar pasa el gate, grafo corre hasta interrupt sin publicar nada, resume approved/rejected). Deuda anotada: checkpointer de LangGraph en memoria (Postgres en F6), `knowledge_pages` omitido declarado.
- Siguiente: **F6** (Langfuse + evals como gate + knowledge_pages/wiki + checkpointer Postgres). Cierra P1 completo (F7 = matriz de autonomía y pulido).
