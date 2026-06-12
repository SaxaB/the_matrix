# apps/agent — saxa

Orquestador de agentes de the_matrix (arquitectura Hermes, diseño §5). Python
propio que llama a APIs de modelo por token — Claude Code/Codex solo construyen,
nunca son runtime (§5bis).

## Qué hay (F3)

| Pieza | Módulo | Origen |
|---|---|---|
| Router de modelos | `saxa.core.router` + `infra/models.yaml` | nuevo (§5ter.1) |
| Presupuesto (tarea + tope diario, persistido) | `saxa.core.budget` + `agent.llm_spend` | nuevo (§5ter.2) |
| Runner de loops con hard stops | `saxa.core.loop` + `infra/loops.yaml` | nuevo (§5quater) |
| Hermes (intención → pipeline → síntesis → gates) | `saxa.core.orchestrator` | nuevo |
| Clasificador de intención cheap-first | `saxa.domains.finance.intent` | keywords portadas de `research_pipeline.py` |
| Research pipeline finanzas | `saxa.domains.finance.pipeline` | reescrito usando `research_pipeline.py` como espec |
| Step 0 (cartera real) | `saxa.domains.finance.step0` | nuevo: lee Postgres, no bitácora |
| `source_gate` + `valuation_gate` | `saxa.gates.source_gate` + `data/source-policy.yaml` | portado de financial-freedom (sin modo hook) |
| `telegram_md_lint` | `saxa.gates.telegram_md_lint` | portado casi verbatim |
| Tools `technical` (desde `yahoo_eod_bars`), `finnhub` | `saxa.tools.*` | adaptadas de `tools/scripts/` |
| Gateway Telegram (long polling + allowlist) | `saxa.gateway.telegram` | nuevo |

Reglas heredadas cableadas: autonomía **L2** (recomienda, nunca ejecuta), fuentes
que fallan se declaran **omitidas con motivo** (REGLA #6), publicar sin gate = loop
roto. Fuentes sociales (X, Reddit, Citrini, Cárpatos) se declaran omitidas hasta F4.

## Uso

```sh
cd apps/agent
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/pytest                 # 26 tests, sin red ni Postgres
.venv/bin/saxa check             # valida router, policy, conexión
.venv/bin/saxa briefing          # genera un briefing y lo imprime (necesita stack + keys)
.venv/bin/saxa run               # gateway Telegram 24/7 (contenedor `agent` en compose)
```

Env (ver `.env.example`): `DATABASE_URL`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_ALLOWED_CHAT_IDS` (vacía = ignora todo), `FINNHUB_API_KEY`.

## F4a (finanzas) — añadido

| Pieza | Módulo | Notas |
|---|---|---|
| `portfolio` (PnL, exposición, R abierto) | `saxa.domains.finance.portfolio` | sobre `holdings`+`cash_balances`+`trade_plans` (migración 0005) |
| `risk_engine` + `risk_gate` | `saxa.domains.finance.risk` + `infra/risk-rules.yaml` | TradePlan §9bis.2; sizing por riesgo, R calculado no inventado, límites de cartera; planes quedan `gated` (publicar = humano, ámbar) |
| `reddit_retail` | `saxa.tools.reddit` | JSON público, sin key |
| `x_stonks` | `saxa.tools.x_lists` | Apify con pool `APIFY_KEYS` y fallback 402/429 |
| `citrini_substack` | `saxa.tools.citrini` | Jina (s.jina.ai/r.jina.ai), pool `JINA_KEYS` |

El briefing ya consume las 3 fuentes sociales en paralelo (config en
`data/source-policy.yaml#pipeline_defaults`); solo `carpatos` sigue declarándose
omitida (F5, scraping serenitymarkets vía §7bis).

## F5 — añadido

| Pieza | Módulo | Notas |
|---|---|---|
| Radar semanal (§9bis.3) | `saxa.domains.finance.radar` + `infra/radar-rules.yaml` | scoring determinista (técnico+fundamental+riesgo+narrativa), top N con plan preliminar pasado por risk_gate, persistido en `radar_runs`/`radar_candidates`; `saxa radar` |
| Grafo de decisión (§9bis.4) | `saxa.domains.finance.decision` (LangGraph) | market_data→historical_context→risk_sizing→tax_impact→synthesis→**human_approval (interrupt rojo)**; aprobación en `agent.approvals` |
| Comandos HITL Telegram | gateway | `/decidir TICKER [pregunta]`, `/planes`, `/aprobar <id>`, `/rechazar <id>` |
| `carpatos` | `saxa.tools.carpatos` | transcript del último vídeo de @JoseLuisCarpatos vía yt-dlp (gratis); ya no hay fuentes pendientes en el briefing |

## Pendiente (fases siguientes)

- F6: Langfuse (atribución por span) + evals como gate + `knowledge_pages` (el nodo
  historical_context del grafo hoy declara omisión) + checkpointer Postgres de LangGraph
  (hoy InMemorySaver: un reinicio entre /decidir y /aprobar pierde el thread; el plan
  queda en `gated` y se relanza).
- Registro de `loop_runs` en Postgres al ejecutar loops (hoy solo en memoria/logs).
- Validación en vivo (EQR6): `saxa check` contra stack real, briefing end-to-end,
  radar sobre universo real.
