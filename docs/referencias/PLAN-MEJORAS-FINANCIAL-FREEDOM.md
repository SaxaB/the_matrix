# Plan de mejoras: llevar `financial-freedom` al siguiente nivel

> **DEPRECADO (2026-06-04).** Este documento queda **superado** por
> `Mejoras/DISENO-SISTEMA-UNIFICADO.md`, que es ahora el **documento canónico**: el proyecto se
> rediseña desde cero sobre el Beelink EQR6 (no es una mejora incremental del repo actual). Las
> ideas vivas de este plan (motor de riesgo + trade plans, radar/screener, grafo de decisión,
> LLM Wiki, autonomía L0-L4) ya están **integradas** en el documento de diseño. Se conserva solo
> como **histórico**. No usar como referencia operativa.

> Documento de diseño. Compara el estado actual de `financial-freedom` (verificado en el repo y
> en `Mejoras/FINANCIAL-FREEDOM/ANALISIS-PROYECTO.md`) con dos referencias: el pipeline de datos
> de **FinAI** (`Mejoras/FinAI/*`) y la **arquitectura de referencia** de sistemas multiagente de
> inversión (`Mejoras/arquitectura_referencia_sistema_agentes_inversion.md`). No es runtime: es la
> hoja de propuestas. Las reglas operativas siguen siendo `AGENTS.md`.
>
> Convención del repo respetada: español, fechas ISO, sin guion largo U+2014 (REGLA DURA #17).
>
> **Revisado 2026-06-03**: desde la primera versión del plan, el repo construyó una **capa web del
> grupo** (`finfreedom.pages.dev`, ver §7 del análisis) que **ya cubre parte de lo propuesto**.
> Este documento se ha adaptado: lo cubierto se marca y se reorienta hacia el hueco real; lo que
> sigue abierto se mantiene. Ver la sección 0bis para el mapa de cobertura.

---

## 0bis. Qué ya está cubierto (actualización 2026-06-03)

La capa web (commits #1 a #7) adelantó varios puntos del plan original. Resumen honesto de estado:

| Punto del plan | Estado | Qué lo cubre hoy | Qué sigue faltando |
|---|---|---|---|
| §2 Base de datos | 🟡 Parcial (otra forma) | **D1 (Cloudflare SQLite)** para `notas`+`eventos` de la web; JSON estructurado en `tools/data/finfreedom/` como fuente; Git canónico | Postgres de **mercado** (precios/fundamentales/histórico) y de **cartera analítica**: sin empezar |
| §3 ETL de mercado | 🔴 No | Precio en **vivo** vía Worker (Yahoo+Finnhub+KV) | ETL histórico SEC/Yahoo a DB, universo poblado |
| §4 Gestor de cartera | 🟢 Bastante cubierto | `participants.json` (posiciones por miembro, long vs trade, entry/target/stop/size_pct) + `bitacora/trades.jsonl` (log del agente) + **P/L y R:R en vivo** + cierre a precio | motor de **exposición agregada** (neto long/short, % por tesis correlacionada), no per-miembro |
| §5 Riesgo (SL/TP/R:R) | 🟡 Parcial | Cada trade ya lleva **SL, TP, R:R** y `size_pct`; la web los calcula | **entradas/salidas escaladas** (tramos), sizing por volatilidad, `risk_gate.py` que **haga cumplir** límites |
| §6 Radar / lista semanal | 🟡 Parcial (manual) | Página **Temas** (`temas.json`, score 1-5, pure plays) + rotación: tablero curado a mano | **screener automático** sobre universo que rellene esos candidatos |
| §8 Memoria que compone | 🟡 Parcial (semilla) | **Threads** (`threads.json`): síntesis viva, fechada, por tema, con `ref_doc` y tags = patrón LLM Wiki manual | **integración automática** (compactación nocturna) + RAG/Qdrant |
| §11 Guardrails / HITL | 🟡 Parcial | Patrón **web propone evento → agente concilia a Git** (posiciones/watchlists), notas dueño D1 | matriz L0-L4 explícita + límites duros (`max_tool_calls`, coste) |
| §7 Decisión (LangGraph), §9 Orquestación, §10 Observabilidad | 🔴 No | sin cambios | el grueso del salto agéntico sigue pendiente |

**Reorientación**: el plan deja de ser "construir cartera/radar/memoria de cero". El siguiente
salto natural es **automatizar lo que ya existe manual** (Temas → screener real; Threads → wiki
auto-integrada) y **añadir el gate de riesgo** sobre los trades que ya tienen SL/TP/R:R.

**Nota de privacidad (cambio de criterio respecto a v1)**: el grupo ya aceptó alojar datos del
grupo (sin PII) en **Cloudflare D1 + Pages tras Access**. Eso relaja la postura "todo en local"
de la v1: los **sesgos personales** y la bitácora siguen en local/gitignored (REGLA #7), pero los
datos de mercado y posiciones declaradas (anónimas) ya viven en edge. La DB de mercado puede ser
local **o** apoyarse en este patrón; ver §2.1 revisado.

---

## 0. Resumen ejecutivo (TL;DR)

`financial-freedom` hoy es un **asistente de análisis basado en ficheros** con una **capa web del
grupo** ya montada (datos estructurados JSON, Cloudflare D1/Workers, P/L y R:R en vivo). Funciona y
ha avanzado, pero aún le faltan pilares para ser un "sistema de inversión" de verdad (ver el mapa
de cobertura en 0bis):

1. **No tiene DB de mercado.** Hay D1 para la edición web, pero no histórico consultable de
   precios, fundamentales ni operaciones para cribar/analizar.
2. **El riesgo está a medias.** Cada trade ya lleva SL/TP/R:R/`size_pct`, pero falta el motor que
   **haga cumplir** límites, el sizing por volatilidad y las entradas/salidas **escaladas**.
3. **El radar es manual.** La página Temas cura candidatos a mano; falta el screener que cribe el
   universo y los proponga solo.
4. **No tiene la capa agéntica madura** de la arquitectura de referencia: orquestación
   garantizada (LangGraph), memoria que **se auto-integra** (Threads es la semilla manual del LLM
   Wiki), observabilidad/evals, guardrails con autonomía progresiva formal.

Las **cinco apuestas principales** de este plan:

- **A. Base de datos local (Postgres self-hosted en el mini PC)** + ETL automatizado, tomando el
  modelo de FinAI pero **sin cloud** para los datos privados de cartera (privacidad, REGLA #7).
- **B. Gestor de cartera + motor de riesgo ejecutable**: posiciones, operaciones, PnL, sizing por
  % y por volatilidad, entradas/salidas escaladas, SL/TP, todo como datos y reglas, no prosa.
- **C. Radar/screener semanal**: criba el universo (~500 tickers) y emite una "lista de compra de
  la semana" rankeada, integrando los 5 criterios de `next-pelotazos-vigilancia.md`.
- **D. Motor de recomendaciones con flujo garantizado (LangGraph)** + guardrails HITL: el sistema
  propone plan de entrada/salida con sizing y SL/TP, nunca ejecuta solo.
- **E. Infra agéntica**: memoria que compone (LLM Wiki + RAG), observabilidad (OTel/Langfuse),
  evals como CI, y orquestación Hermes + N8N, dimensionado al mini PC N150/16 GB real.

---

## 1. Diagnóstico comparado

| Capacidad | `financial-freedom` hoy (2026-06-03) | FinAI | Arquitectura de referencia | Brecha |
|---|---|---|---|---|
| Persistencia de datos | JSON estructurado + **D1 (web)**, sin DB de mercado | **Supabase (Postgres) cloud** | Postgres + Qdrant + Mem0 self-hosted | Media |
| ETL / actualización | Manual por petición + **precio live (Worker)** | **GitHub Actions (cron) SEC + Yahoo + risk** | Agente de mercado daemon + N8N | **Alta** |
| Universo cubierto | Watchlists JSON (~140 tickers) | S&P ∪ NDX ∪ Dow (~500) | Configurable | Media |
| Gestión de cartera | **`participants.json` + `trades.jsonl` + web (P/L, R:R, cierre a precio)** | Holdings + cash + venta a cash | `portfolio_operations` + snapshot tool | Baja-media |
| Gestión de riesgo / sizing | **SL/TP/R:R por trade + `size_pct`**; sin sizing por vol ni gate | `finai_risk_score` (5-95) determinista | Nodo fiscal + sizing en grafo de decisión | Media |
| Screener / radar | **Página Temas (manual)**, no criba automática | No (es app de cartera) | Implícito en agente de mercado | **Alta** |
| Recomendación estructurada | Prompt + playbook (memoria) | Informe IA de perfil (servidor) | **Grafo LangGraph 4 nodos + HITL** | **Alta** |
| Memoria | Markdown + **Threads (wiki manual)** | Sin memoria de agente | 3 niveles + **LLM Wiki** + RAG Qdrant | Media-alta |
| Orquestación | Claude Code + scripts + **build/deploy web** | App Next.js + Server Actions | **Hermes + LangGraph + N8N (MCP/A2A)** | **Alta** |
| Observabilidad / evals | Ninguna | Ninguna | **OTel + Langfuse + evals como CI** | **Alta** |
| Guardrails / autonomía | **HITL de facto (web propone, agente concilia)** | N/A | **L0-L4 + HITL + semáforo + límites** | Media |
| Alertas proactivas | `market_watch.py` (manual) | Notificaciones (TODO) | N8N umbral + cron + Telegram | Media |
| Despliegue | tmux en mini PC + **Cloudflare Pages/Workers/D1** | Vercel + Supabase | **Docker Compose self-hosted** | Media |

**Lectura**: `financial-freedom` tiene lo más difícil de copiar (las tesis, el dominio, las
reglas duras curadas por fallos reales, el formato Telegram). Lo que le falta es **infraestructura
de datos y la capa agéntica/operativa**, que es justo lo que FinAI (datos) y la arquitectura de
referencia (agentes) aportan.

---

## 2. Capa de datos: de ficheros a base de datos

### 2.1 Decisión de fondo: Postgres local para mercado, D1 ya cubre la edición web

**Estado 2026-06-03**: ya existe una **D1 (Cloudflare SQLite)** para la web (`notas` + `eventos`)
y JSON estructurado en `tools/data/finfreedom/`. Eso **no** es la DB de mercado que pide este
plan: la D1 sirve la edición del grupo, no el histórico de precios/fundamentales ni la cartera
analítica. La pieza que falta sigue siendo una **DB de mercado consultable**.

FinAI usa Supabase (Postgres gestionado en la nube). Propuesta para el hueco real:

- **Postgres self-hosted en el mini PC `lsmachenike`** (contenedor Docker `postgres:16`) como
  almacén de **mercado** (precios EOD, fundamentales, risk score) y de **cartera analítica**
  (operaciones, snapshots, equity). Es donde el screener (§6) y el motor de riesgo (§5) leen.
- **Privacidad matizada (cambio respecto a v1)**: el grupo ya acepta D1+Pages tras Access para
  datos sin PII, así que el dogma "todo en local" se relaja. Regla práctica: **datos de mercado**
  pueden vivir en local o en edge indistintamente; **sesgos personales y bitácora** siguen
  gitignored en el host (REGLA #7). La D1 actual puede incluso servir de espejo de lectura para la
  web sin duplicar lógica.
- Se reutiliza el **modelo de datos y los ETL de FinAI** (probados), reescritos como módulos del
  repo (Python, no TypeScript, para encajar con los scripts actuales).

### 2.2 Esquema propuesto (tres dominios)

**Dominio mercado** (datos públicos, poblado por ETL, calcado de FinAI):

| Tabla | Origen | Contenido |
|---|---|---|
| `us_symbols` | SEC | ticker ↔ CIK + nombre/exchange |
| `sec_edgar_metrics` | SEC EDGAR | fundamentales US-GAAP aplanados (whitelist conceptos) |
| `yahoo_eod_bars` | Yahoo | velas diarias OHLCV (~2 años por ticker) |
| `yahoo_asset_snapshot` | Yahoo | ratios, market cap, P/E, beta, 52w, earnings date |
| `asset_risk_score` | calculado | risk score determinista (ver §5), breakdown JSON |
| `asset_quotes` | en vivo | caché de cotización con TTL |

**Dominio cartera** (privado, local):

| Tabla | Contenido |
|---|---|
| `positions` | posiciones abiertas: ticker, dirección (long/short), tamaño, precio medio, % cartera |
| `portfolio_operations` | log append-only de operaciones (BUY/SELL/SHORT/COVER) con tesis y contexto del agente |
| `cash_balances` | efectivo por divisa (patrón `CASH-{CCY}` de FinAI) |
| `portfolio_daily_values` | snapshot diario de valor y PnL (para curva de equity y drawdown) |
| `risk_rules` | límites vivos: % máx por nombre, % máx por tesis correlacionada, drawdown, etc. |
| `trade_plans` | plan por posición: entradas/salidas escaladas, SL, TP, invalidación, R objetivo |

**Dominio memoria/conocimiento** (de la arquitectura de referencia, §7):

| Tabla | Contenido |
|---|---|
| `market_events` | eventos: earnings, rating_change, price_alert (idempotente, §11.1 ref) |
| `agent_skills` | skills autogeneradas con `status` (candidate/validated) y `eval_score` |
| `knowledge_pages` | LLM Wiki: síntesis viva por ticker/sector/tesis (ver §8) |
| `agent_events` | memoria episódica: cada invocación con inputs/outputs y `trace_id` |

### 2.3 Qué se migra y qué se queda en Markdown

- **Se migra a DB**: precios, fundamentales, watchlists (hoy JSON), posiciones, operaciones, risk
  budget (hoy prosa), catalizadores con fecha.
- **Se queda en Markdown** (es su sitio natural y la wiki lo referencia): tesis de fondo
  (`analisis/`), reglas (`AGENTS.md`), deep dives. La DB **enlaza** a estos docs, no los sustituye.
- `tesis-activas.md` pasa a tener un **espejo estructurado** en DB (`thesis` con estado,
  convicción, invalidación, sizing target) para que el motor de riesgo y el de decisión lo lean
  por código, manteniendo el Markdown como vista humana.

---

## 3. Pipeline de actualización de datos (workflows)

Adoptar el patrón ETL de FinAI, adaptado al mini PC. FinAI usa GitHub Actions porque su app es
serverless (Vercel); aquí tenemos un host residente, así que hay tres opciones de scheduler:

| Opción | Cómo | Cuándo |
|---|---|---|
| **Scheduler de Hermes** | tareas programadas del daemon | preferida cuando Hermes esté operativo (ya es el plan en el roadmap) |
| **N8N (cron)** | workflows deterministas con cron + Telegram | para alertas de umbral y triggers de calendario sin LLM |
| **systemd timers** | unidades `.timer` en el host | fallback simple mientras no haya Hermes/N8N |
| GitHub Actions | como FinAI | solo para datos públicos no sensibles; no para cartera |

**Cadencia propuesta** (calcada de FinAI, §6):

| Job | Frecuencia | Comando propuesto |
|---|---|---|
| Yahoo incremental + snapshot | diaria, tras cierre US | `etl_yahoo.py --universe indices` |
| Risk score | diaria, tras Yahoo | `etl_risk.py` |
| SEC company facts | semanal (lunes) | `etl_sec.py --universe indices --skip-if-fetched-days 7` |
| Snapshot diario de cartera | diaria, al cierre | `portfolio.py snapshot` |
| Radar/screener | semanal (domingo noche) | `radar.py run --emit buy-list` |
| Compactación de memoria/wiki | nocturna (03:00) | `memory_compact.py` |

**Backfill on-demand** (patrón `ensureMarketDataForTicker` de FinAI): al añadir una posición o al
analizar un ticker sin datos, disparar SEC + Yahoo + risk de ese ticker. Encaja con la REGLA #4
(datos en vivo) y elimina los "huecos" del universo.

> Nota mini PC: la precarga inicial del universo (~500 tickers) es pesada (FinAI le da 180-360 min
> de timeout). En el N150 conviene correrla por lotes y de noche, con throttle a la SEC (User-Agent
> identificado, límite de req/s) como ya prevé `TASKS.md #4`.

---

## 4. Gestor de cartera (parcialmente cubierto)

> **Ya cubierto (2026-06-03)**: `tools/data/finfreedom/participants.json` registra posiciones por
> miembro como objetos `{ticker, dir, kind(posicion|trade), entry, target, stop, size_pct, tesis}`,
> separa **largo plazo** de **trades tácticos**, y la web calcula **P/L y R:R en vivo**. El agente
> loguea sus aperturas/cierres en `bitacora/trades.jsonl` y el **cierre a precio** calcula P/L
> realizado. Esto cubre el grueso del "gestor de cartera" para el caso de uso del grupo.
>
> **Lo que falta** (foco de esta sección): un **estado agregado de cartera** (no per-miembro):
> exposición neta long/short, % por tesis correlacionada, curva de equity y drawdown, y un Step 0
> que lea ese agregado estructurado en vez de prosa.

Hoy las posiciones están estructuradas (JSON) pero **no hay vista agregada ni histórico de
equity**. Propuesta: un **módulo de cartera analítica** sobre las tablas del dominio cartera
(§2.2) que consuma `participants.json` + `trades.jsonl` y produzca el agregado.

### 4.1 `portfolio.py` (CLI + herramienta MCP)

- `portfolio.py add` / `close` / `scale`: registra operaciones en `portfolio_operations` y
  actualiza `positions` (idempotente).
- `portfolio.py snapshot`: estado actual (posiciones, precio medio, precio vivo, PnL no realizado,
  % de cartera por nombre y por tesis, exposición neta long/short, cash). Es la herramienta
  `get_portfolio_snapshot()` del contrato de la referencia (§11.2).
- `portfolio.py equity`: curva de equity y drawdown desde `portfolio_daily_values`.
- Soporta **cash como ticker sintético** `CASH-{CCY}` y **venta parcial a efectivo**
  (`sellHoldingToCash` de FinAI).

### 4.2 Integración con lo existente

- El **Step 0** (REGLA #6) deja de leer prosa y pasa a `portfolio.py snapshot --json`: más fiable,
  estructurado y enlazable por el motor de decisión.
- `market_watch.py` ya vigila tickers de cartera; ahora leerá las posiciones reales de la DB en
  vez de una lista hardcodeada en `watch-rules.yaml`.
- Mantener `bitacora/*.md` como **narrativa** (decisiones, sesgos), pero el **estado numérico**
  pasa a DB. La privacidad se preserva: Postgres local, nada sale del host.

---

## 5. Sistema de gestión de riesgo (sizing, entradas/salidas escaladas, SL/TP)

Es la pieza que el usuario pide explícitamente y la que más valor añade.

> **Ya cubierto (2026-06-03)**: los trades de `participants.json` ya llevan **stop (SL), target
> (TP), `size_pct` y R:R** calculado en la web. Es decir, el *dato* de riesgo por trade existe.
> **Lo que falta** es lo "diseñado": (a) **entradas/salidas escaladas** en tramos, (b) **sizing por
> volatilidad** (no % a ojo), y (c) un **`risk_gate.py` que haga cumplir** los límites antes de
> emitir una recomendación. El resto de esta sección se centra en eso.

Hoy el sizing por nombre/tesis y el escalado existen solo como prosa ("10% por nombre, 20% por
tesis correlacionada"); la propuesta es **convertirlos en un motor ejecutable** que el sistema
aplica y verifica, igual que `source_gate.py` aplica la cobertura de fuentes.

### 5.1 Motor de sizing y riesgo (`risk_engine.py`)

Combina tres capas (inspirado en el `finai_risk_score` de FinAI, ampliado a sizing operativo):

1. **Risk score por activo** (5-95, determinista, calcado de FinAI): beta, P/E, dividend yield,
   market cap, posición vs 52w (snapshot Yahoo) + volatilidad/momentum (serie EOD) + calidad
   fundamental (SEC whitelist). No es consejo, es un input.
2. **Sizing por volatilidad**: tamaño de posición en funcion del ATR/volatilidad y del riesgo por
   trade objetivo (p. ej. arriesgar X% del equity por idea), no un % fijo a ciegas.
3. **Límites de cartera** (`risk_rules`): % máx por nombre, % máx por tesis correlacionada,
   drawdown máximo, exposición neta long/short, correlaciones (no concentrar T2+T3 si ambas son
   "memoria/semis").

### 5.2 Plan de trade escalado (`trade_plans`)

Para cada idea, el sistema genera y guarda un plan estructurado:

```jsonc
{
  "ticker": "SNDK",
  "direction": "short",
  "target_weight_pct": 10,            // del equity (tope risk budget)
  "entries": [                         // entradas escaladas
    { "level": 145, "weight_pct": 4, "trigger": "rebote a SMA20" },
    { "level": 160, "weight_pct": 3, "trigger": "extensión gamma" },
    { "level": 175, "weight_pct": 3, "trigger": "blow-off" }
  ],
  "stop_loss": { "level": 185, "type": "hard", "r_risk_pct": 2.0 },
  "take_profits": [                    // salidas escaladas
    { "level": 110, "close_pct": 40 },
    { "level": 90,  "close_pct": 40 },
    { "level": 70,  "close_pct": 20 }
  ],
  "invalidation": "GM > 79% y bit growth YoY > 5% en Q4 FY26",
  "r_multiple_target": 3.0
}
```

- **Entradas y salidas escaladas**: nunca todo de golpe; el plan define tramos con su trigger.
- **SL duro** ligado a un % de riesgo del equity (R), no a una corazonada.
- **Take profits escalados** con % de cierre por nivel.
- **Invalidación fundamental** separada del stop técnico (alineado con el playbook actual del
  Tipo 3, position management).

### 5.3 Defensa en código (gate de riesgo)

Igual que `source_gate.py` bloquea briefings sin fuentes, un **`risk_gate.py`** valida toda
recomendación operativa antes de enviarse:

- ¿El sizing propuesto respeta `risk_rules` (por nombre, por tesis, drawdown)? Si no, degradar o
  bloquear.
- ¿La recomendación incluye SL, niveles de entrada/salida y R objetivo? (REGLA #5 ya pide niveles
  binarios; esto lo formaliza.)
- ¿Precio validado con doble fuente? (REGLA #5.)
- Nunca promediar a la baja en un corto en contra (regla ya en el playbook): el gate lo impide.

Esto sube el cumplimiento de las REGLAS #3, #5 y #6 de "confiar en que el LLM se acuerde" a
"verificado por código".

---

## 6. Sistema de radar / screener (lista de compra semanal)

> **Ya cubierto en parte (2026-06-03)**: existe la página **Temas** (`temas.json`, proyección de
> `next-pelotazos-vigilancia.md`) con score 1-5, tesis corta y pure plays con precio en vivo, más
> el bloque de rotación. Es el **tablero de "dónde mirar / candidatos"**, pero **curado a mano**.
> Lo que falta es el **motor que lo rellene solo**: cribar el universo y proponer/actualizar esos
> candidatos en vez de teclearlos. Esta sección describe ese motor, que ahora **alimenta Temas**
> en lugar de crear un tablero desde cero.

Hoy no existe forma sistemática de **cribar un universo** y proponer candidatos (el tablero Temas
es manual). Con la DB poblada (§2) esto es directo.

### 6.1 `radar.py`: criba multi-criterio sobre el universo

Recorre el universo (~500 tickers, ampliable) en DB y puntúa cada uno contra criterios
configurables en un YAML (`tools/data/radar-rules.yaml`), por ejemplo:

- **Valoración**: fwd P/E, EV/EBITDA, PEG dentro de rango por sector (de `yahoo_asset_snapshot` y
  SEC).
- **Momentum/técnico**: por encima de SMA50/200, RSI en rango, ruptura de rango (de `technical.py`
  y `yahoo_eod_bars`).
- **Riesgo**: `asset_risk_score` aceptable para el perfil.
- **Catalizador**: earnings próximos, evento en `market_events`.
- **Criterios next-pelotazos** (de `analisis/next-pelotazos-vigilancia.md`): necesidad
  estructural, catalizador 6-24m, pure plays accesibles, valoración no totalmente pricing-in,
  pre-mainstream. Un ticker que cumple >= 3 entra al radar con score alto.

### 6.2 Salida: "lista de compra de la semana"

`radar.py run --emit buy-list` produce:

- Un ranking de candidatos con score, criterios cumplidos, y por qué (cita fuentes/eventos).
- Para los top-N, un **borrador de `trade_plan`** (§5.2) con sizing sugerido y SL/TP, listo para
  revisión humana.
- Publicación: HTML en r-files `/finfreedom/` + TL;DR al grupo de Telegram (umbral HTML ya
  definido en el playbook). Cron semanal (domingo noche) vía N8N o Hermes.

> Importante: el radar **propone**, no compra. Encaja con la autonomía progresiva (§9): el radar es
> L1/L2 (reporta/recomienda), la ejecución es siempre humana.

### 6.3 Relación con lo existente

- Reutiliza `technical.py` (señales, rotación sectorial) y los criterios de
  `next-pelotazos-vigilancia.md` (que hoy se evalúan a mano).
- Alimenta automáticamente la watchlist "comprar esta semana" y, con el tiempo, deja traza en
  `market_events` de qué detectó y qué pasó después (insumo para evals y para la wiki).

---

## 7. Motor de recomendaciones de inversión (LangGraph)

La arquitectura de referencia (§5) define el patrón: cuando hay consecuencias económicas, el LLM
no decide el orden ni la completitud de los pasos. Se implementa un **grafo de decisión garantizado**
como herramienta MCP que Hermes invoca para preguntas de tipo "¿compro/vendo/mantengo X?".

### 7.1 Grafo propuesto (adaptado al dominio del repo)

```
entry → market_data → historical_context → risk_sizing → tax_impact → synthesis → (condicional)
                                                                                      ├─ confidence<0.6 → human_review
                                                                                      ├─ acción ejecutable → human_approval (HITL)
                                                                                      └─ fin
```

- **market_data**: precio validado doble fuente + news (Finnhub/Yahoo). Reusa `valuation.py`.
- **historical_context**: consulta la **wiki del ticker** (§8) y la memoria episódica (tesis
  previa, errores pasados en ese nombre). Aquí entra el valor de la memoria que compone.
- **risk_sizing**: aplica `risk_engine.py` (§5): % de cartera permitido, plan escalado, SL/TP.
  **Este nodo es propio de este repo** y no está en FinAI ni explícito en la referencia.
- **tax_impact**: PnL realizado y coste fiscal estimado (legislación UE/ES configurable). Hoy no
  existe; es alto valor para un grupo que opera real.
- **synthesis**: recomendación estructurada con confianza explícita (REGLA #5) y `trade_plan`.
- **human_approval**: gate HITL; el sistema nunca ejecuta una orden por su cuenta.

### 7.2 Contrato y formato

- Salida estructurada que respeta el formato Telegram del repo (HTML, iconos, scoring) y las
  REGLAS #2 (instrumentos), #3 (fair value DCF propio), #5 (sanity checks).
- El nodo de síntesis produce el plan de §5.2; el `risk_gate.py` lo valida antes de emitir.

---

## 8. Memoria y conocimiento (LLM Wiki + RAG)

> **Ya cubierto como semilla (2026-06-03)**: la página **Threads** (`threads.json`) es justo el
> patrón LLM Wiki **en versión manual**: por cada tema/evento/pregunta hay una página viva con
> **log fechado**, estado (abierto/seguimiento/cerrado), tags, tickers y `ref_doc` al `.md` de
> detalle. Es exactamente el sustrato "conocimiento que compone". **Lo que falta** es la
> **automatización**: que los eventos del día se integren solos (compactación nocturna) y un RAG
> para detalle puntual. Threads pasa a ser la semilla que la wiki auto-mantiene.

Hoy la memoria es Markdown plano (`agent-memory/`, `analisis/`) más los Threads (manuales).
Funciona como índice y log, pero **no se auto-integra**: cada análisis reconstruye el contexto a
mano. La referencia (§7.3) propone la capa que falta.

### 8.1 Tres capas (de la referencia)

| Capa | Implementación propuesta | Qué guarda |
|---|---|---|
| RAG (datos) | **Qdrant** (Docker) con corpus de noticias/filings | trozos recuperables, sin estado |
| Episódica | `agent_events`, `market_events`, `portfolio_operations` en Postgres | histórico append-only |
| **LLM Wiki** | `knowledge_pages` (Markdown vivo, versionado) | síntesis que compone con el tiempo |

### 8.2 La wiki sobre lo que ya existe

- Cada ticker/sector/tesis tiene una `knowledge_page` que **integra** cada earnings, noticia o
  cambio de rating (no solo lo indexa): refina el resumen, aflora contradicciones, sube/baja la
  confianza de la tesis.
- `analisis/*.md` (deep dives) y `tesis-activas.md` son la **semilla** de las páginas de tesis; la
  wiki las mantiene vivas con los eventos diarios.
- El nodo `historical_context` del grafo (§7) lee primero la wiki (barata, profunda) y solo cae a
  RAG para detalle puntual.

### 8.3 Compactación nocturna

Job a las 03:00 (referencia §7.2): deduplica memoria semántica, marca tesis validadas/invalidadas
con su outcome, integra los eventos del día en la wiki, y poda episódico antiguo. Corre con
**modelo local (Ollama)** para no exponer datos de cartera (privacidad). Esto operacionaliza algo
que hoy se hace a mano al "reabrir sesión".

---

## 9. Orquestación de agentes (Hermes + LangGraph + N8N, MCP/A2A)

El repo ya apunta a Hermes como runtime objetivo. La referencia define cómo encaja todo:

| Pieza | Rol | Mapea a lo que hay |
|---|---|---|
| **Hermes** | orquestador único, memoria, clasificación de intención | ya es el plan (roadmap Hermes) |
| **Agente de mercado** | ingesta continua, alertas, indexa noticias | `market_watch.py` + ETL + Qdrant |
| **Agente de decisión** | grafo LangGraph de §7 | nuevo |
| **Agente de reporting** | informe semanal HTML + audio TTS | `generate_dashboard.py` + r-files + (TTS nuevo) |
| **N8N** | alertas de umbral, calendario earnings, triggers cron sin LLM | sustituye el cron manual de `market_watch` |
| **MCP** | exponer scripts como herramientas (`valuation`, `technical`, `portfolio`, `radar`) | los scripts actuales se envuelven como tools MCP |
| **A2A** | (opcional) integrar agentes externos de research vía Agent Cards | futuro |

**Acción concreta de bajo coste**: envolver los scripts existentes (`valuation.py`,
`technical.py`, `finnhub_query.py`, el nuevo `portfolio.py` y `radar.py`) como **herramientas MCP**
con contratos explícitos (docstring = contrato, §11.2 ref) e **idempotentes** (§11.1 ref). Es la
base para que Hermes los orqueste sin lógica nueva.

---

## 10. Observabilidad y evals (infraestructura, no opcional)

Hoy no hay ninguna traza ni test de comportamiento del agente. La referencia (§10) lo trata como
el CI/CD de los agentes. Propuesta dimensionada al mini PC:

### 10.1 Observabilidad

- Instrumentar con **OpenTelemetry (GenAI conventions)**: cada llamada a LLM, herramienta y nodo
  emite un span con tokens, coste y latencia.
- Backend: **Langfuse self-hosted** (privacidad: las trazas llevan datos de cartera). **Aviso de
  hardware**: Langfuse + ClickHouse pesan; en un N150/16 GB compiten con Ollama. Opciones: (a)
  arrancar con logging estructurado a Postgres + un dashboard ligero y posponer Langfuse, o (b)
  Langfuse en un host aparte. Ver §12.

### 10.2 Evals como gate (lo que más encaja con la cultura del repo)

El repo ya tiene la mentalidad de "defensa en código" (`source_gate.py`, `telegram_md_lint.py`).
Los evals son su evolución natural:

- **Regression suite (golden set)**: casos fijos con comportamiento esperado. Ya existe material:
  el bug de pre-market del 2026-05-15, la confusión release/call de earnings (REGLA #15), el
  prompt injection desde noticias. Cada uno es un caso dorado.
- **Trajectory testing**: ¿el grafo de decisión ejecutó los nodos en orden (no se saltó el fiscal
  ni el de riesgo)? ¿respetó el approval gate?
- **LLM-as-judge** (modelo distinto del evaluado): puntúa recomendaciones contra el outcome real
  ya conocido (la DB de operaciones lo permite).
- Integrar como gate en CI (el repo ya usa `py_compile` y `telegram_md_lint --self-test`).

---

## 11. Guardrails y autonomía progresiva

El repo ya cumple el principio más importante ("el pipeline no autoriza acciones reales") y, desde
2026-06, hay un **HITL de facto**: la web **propone eventos** (`posicion_*`, `watchlist_*`) que el
agente **concilia** sobre Git; las posiciones las "dueña" Git, no se auto-escriben desde la web.
Falta **formalizarlo** con la matriz de la referencia (§8):

- **Niveles L0-L4**: arrancar cada nueva capacidad en L0/L1 (observa/reporta) y subir solo cuando
  los evals lo respalden. El motor de decisión se queda en **L2 (recomienda, no ejecuta)**.
- **Semáforo de acciones**: verde (lectura/análisis/informe: auto), ámbar (publicar al grupo,
  alerta proactiva: notifica y permite veto), rojo (ejecutar orden, mover fondos, rotar
  credenciales, cambiar límites: aprobación humana explícita). El repo ya trata el envío al grupo
  con cuidado; esto lo sistematiza.
- **Límites duros** (§3.3.2 ref): `max_tool_calls`, `max_iterations`, `cost_budget_usd`,
  `wall_clock_timeout`. Críticos en un mini PC con presupuesto de API limitado.
- **Contenido externo como no confiable**: noticias y tweets scrapeados pueden traer prompt
  injection; sanear antes de pasarlos al LLM (ya hay base con Apify/Jina, falta el saneo explícito).

---

## 12. Infraestructura y despliegue (dimensionado al mini PC real)

El host es un **mini PC Intel N150, 4 núcleos, 16 GB RAM, SSD 512 GB** (confirmado). La referencia
pide 4 núcleos/16 GB como mínimo y **recomienda 32 GB** si se corren modelos locales 7B **y** el
stack de observabilidad. Es decir: **el N150/16 GB llega justo**. Hay que priorizar.

### 12.1 Stack Docker Compose propuesto (por prioridad)

| Servicio | Imprescindible | Coste RAM aprox. | Nota |
|---|---|---|---|
| `postgres:16` | **Sí** | bajo | almacén único (mercado + cartera + memoria) |
| `qdrant` | medio | medio | RAG de noticias; se puede aplazar |
| `n8n` | medio | bajo-medio | alertas/cron deterministas |
| `ollama` | medio | **alto** (modelo 7B) | memoria/compactación local privada; valorar modelo más pequeño (3B) en 16 GB |
| `langfuse` + `clickhouse` | bajo (fase tardía) | **alto** | observabilidad; probablemente **fuera del mini PC** o aplazado |
| `cloudflared` | sí (ya en uso conceptual) | bajo | Tunnel para r-files / dashboard sin abrir puertos |

**Recomendación de fases para el hardware**:

- **Ahora (16 GB)**: Postgres + ETL + N8N + scripts. Observabilidad = logging estructurado a
  Postgres. Modelos pesados via API (con límites de coste), no local.
- **Si se amplía a 32 GB** (o segundo mini PC): añadir Ollama 7B para compactación/memoria local,
  Qdrant a pleno y Langfuse self-hosted.

### 12.2 Operación

- Pasar Claude Code/Hermes de **tmux manual** a **servicio** (systemd o el propio daemon Hermes),
  como ya prevé el roadmap.
- **Backups** de Postgres (la cartera y la memoria pasan a ser datos críticos): dump cifrado
  diario fuera del host. Hoy, al ser ficheros en Git, el backup es implícito; con DB hay que
  diseñarlo.
- **Secrets**: mantener fuera del repo (ya se hace, `secrets.env`); valorar un vault ligero
  (Infisical/Doppler) si crece el número de claves.
- **Privacidad**: todo lo de cartera/memoria en local; APIs externas solo para datos públicos o
  tareas sin PII (REGLA #7 + §11.4 ref).

### 12.3 ¿Comprar un segundo mini PC? (DR vs reparto de roles vs más RAM)

Pregunta directa del maintainer. Conviene separar tres cosas que se suelen mezclar:

**Lo primero, la verdad incómoda sobre "más RAM"**: dos mini PCs **no** suman a una máquina de
32 GB. La RAM **no se agrupa** de forma transparente entre hosts (no sin clústeres exóticos que no
valen la pena aquí). Con dos N150 tienes **dos nodos de 16 GB**, no un host de 32 GB. "Más RAM
útil" solo se consigue **colocando los servicios pesados en el segundo nodo** para que dejen de
competir con el runtime en el primero. Eso sí resuelve el cuello de §12.1 (Ollama 7B + Langfuse +
Qdrant + Postgres no caben juntos en un N150/16 GB).

> **Comprobar antes de comprar**: muchos mini PCs N150 traen la RAM **soldada** o un único SODIMM
> con tope de 16 GB; algunos modelos admiten 1×32 GB DDR5. Si **este** N150 admite 32 GB, ampliar
> RAM en el equipo actual es más simple y barato que un segundo nodo para el caso "más memoria".
> Un segundo nodo solo gana frente a la ampliación cuando además quieres **resiliencia** o
> **aislar** cargas. (Ficha real del equipo en `workspace-llp/It-home/lsmachenike/`.)

**Otra verdad incómoda (CPU)**: el N150 no tiene GPU útil para LLM. Un modelo 7B en CPU N150 va
**lento** aunque esté solo en el segundo nodo. Para inferencia local pesada, ni un N150 ni dos lo
arreglan; eso seguirá siendo API o un nodo con GPU/NPU. El segundo nodo rinde de verdad en lo que
es **I/O y servicios residentes** (Postgres, Qdrant, Langfuse/ClickHouse, ETL por lotes), no en
inferencia.

Con eso claro, tres arquitecturas posibles:

**Opción A. DR puro (activo-pasivo).** Nodo B es un standby caliente que solo entra si A muere.

- Postgres con **streaming replication** (primario en A, réplica en B), repo sincronizado por Git,
  secrets replicados (cifrados). Si A cae, se **promociona** B a primario y Hermes arranca allí.
- Pro: resiliencia ante fallo de hardware. Con: B está **ocioso** el 99% del tiempo, no añade
  capacidad diaria. Para un sistema de grupo cuyo estado canónico ya vive en Git, **dedicar un
  nodo entero a standby es caro en valor**. La parte realmente crítica nueva (Postgres de cartera/
  memoria) se protege casi igual con una réplica + dump cifrado offsite **sin** dedicarle el nodo.

**Opción B. Reparto de roles (activo-activo), recomendada.** Los dos nodos trabajan, divididos por
función. Es lo que de verdad da "más RAM útil":

| Nodo | Rol | Servicios | Por qué ahí |
|---|---|---|---|
| **A `lsmachenike`** (actual) | **Cerebro / interactivo** | Hermes daemon, scripts, gateway Telegram, `source_gate`, Postgres **primario** (footprint bajo), N8N ligero | baja latencia, es el que habla con el grupo |
| **B (nuevo)** | **Datos / async pesado** | Qdrant (RAG), Langfuse+ClickHouse (observabilidad), ETL por lotes + precarga del universo (~500), Ollama si algún día se usa, **réplica Postgres** | son cargas hambrientas de RAM y no interactivas; liberan los 16 GB de A |

- Comunicación por **LAN** (Gigabit) en red privada; si hace falta acceso remoto, mesh
  **Tailscale/WireGuard**, nunca exponer puertos. Los scripts se exponen como **herramientas MCP**
  (§9) accesibles por `host:puerto`; B publica endpoints de Qdrant/Langfuse/ETL que A consume.
- **Degradación elegante**: si B cae, A **sigue dando briefings** (sin RAG/observabilidad/ETL
  nocturno, pero el servicio al grupo no se cae). Si A cae, el grupo pierde el bot hasta failover
  manual (B tiene el repo y puede promover su réplica = DR manual).
- Privacidad intacta (REGLA #7): **ambos nodos están en la misma LAN de casa**, los dos son
  "local"; nada de cartera/sesgos sale a cloud. Los sesgos siguen gitignored en A.

**Opción C. Híbrida (la mejor relación valor/coste).** Es la B **con la réplica Postgres de B
haciendo también de DR**: ganas capacidad diaria (Qdrant/Langfuse/ETL en B) **y** una copia
caliente de la DB crítica. No es un standby ocioso: B trabaja Y protege. Recomendada si se compra
el segundo equipo.

**Recomendación**:

1. Si el objetivo es solo "más memoria": **comprobar si el N150 admite 32 GB** y ampliar; es lo
   más barato y simple. Un segundo nodo no da una máquina de 32 GB.
2. Si el objetivo es **desbloquear el stack pesado** (Ollama/Qdrant/Langfuse, §12.1) y/o tener
   resiliencia: **Opción C (activo-activo por roles + réplica Postgres en B)**. Un segundo N150
   cuesta poco (~150-200 EUR, consumo ~6-15 W) y resuelve el cuello real, que es la **contención**
   de RAM en un único host, no la falta de un host de 32 GB.
3. **DR puro (Opción A) no se justifica por sí solo** para este proyecto: el estado canónico está
   en Git y la DB crítica se cubre con réplica + backup cifrado offsite. La resiliencia se obtiene
   "gratis" como efecto lateral de la Opción C.

> Independientemente del nodo: **backup cifrado diario** de Postgres fuera de ambos equipos (la
> cartera y la memoria pasan a ser datos críticos; hoy, al ser ficheros en Git, el backup es
> implícito; con DB hay que diseñarlo).

---

## 13. Hoja de ruta priorizada

Se integra con `TASKS.md` y el roadmap Hermes existente. Cada fase entrega valor sola.

| Fase | Objetivo | Entregables clave | Depende de |
|---|---|---|---|
| **F1. Datos** | Base de datos + ETL | Postgres local, `etl_sec.py`/`etl_yahoo.py`/`etl_risk.py`, universo poblado, backfill on-demand | (nada) |
| **F2. Cartera + riesgo** | Gestor de cartera y motor de riesgo ejecutable | `portfolio.py`, `risk_engine.py`, `risk_gate.py`, `trade_plans`, Step 0 desde DB | F1 |
| **F3. Radar** | Screener semanal y lista de compra | `radar.py`, `radar-rules.yaml`, integración next-pelotazos, publicación r-files/Telegram | F1, F2 |
| **F4. Decisión** | Recomendación con flujo garantizado + HITL | grafo LangGraph como tool MCP, nodos riesgo+fiscal, approval gate | F2 |
| **F5. Memoria** | LLM Wiki + RAG + compactación | `knowledge_pages`, Qdrant, `memory_compact.py` nocturno | F1 |
| **F6. Orquestación** | Hermes + N8N + MCP | scripts como tools MCP, N8N para alertas/cron, agentes de mercado/decisión/reporting | F1-F5 |
| **F7. Observabilidad/evals** | Trazas + evals como gate | OTel + logging a Postgres (o Langfuse si hay RAM), golden set de evals en CI | transversal, desde F1 |
| **F8. Guardrails/autonomía** | Niveles L0-L4 + semáforo + límites | matriz de autonomía, `limits.yaml`, saneo de contenido externo | transversal |

> **Ajuste 2026-06-03 por lo ya cubierto**: la **cartera** (F2) está en buena parte hecha vía
> `participants.json` + `trades.jsonl` + web (P/L, R:R, cierre a precio); lo que queda de F2 es el
> **agregado de exposición** y el **`risk_gate.py`** (sizing escalado + cumplimiento). El **radar**
> (F3) tiene ya su salida manual (página Temas); F3 es **automatizar la criba** que la rellene. La
> **memoria** (F5) tiene su semilla manual (Threads); F5 es la **auto-integración**. Por eso el
> orden con mejor relación valor/esfuerzo hoy es: **`risk_gate` + sizing escalado (resto de F2)**
> → **DB de mercado (F1)** → **radar automático (F3)** → resto.

**Orden recomendado por impacto/esfuerzo (revisado)**: cerrar primero el **gate de riesgo sobre lo
que ya existe** (trades con SL/TP), luego la **DB de mercado** (F1) que desbloquea el **radar
automático** (F3). F4-F8 son la madurez agéntica y pueden ir en paralelo según avance Hermes y el
segundo nodo (§12.3).

---

## 14. Riesgos, decisiones abiertas y qué NO hacer

- **Privacidad primero**: no replicar el modelo cloud de FinAI para datos de cartera. Postgres
  local. Es coherente con REGLA #7 y §11.4 de la referencia.
- **Hardware modesto**: el N150/16 GB no aguanta todo el stack a la vez (Ollama 7B + Langfuse +
  Qdrant + Postgres). Priorizar; valorar ampliar RAM o segundo nodo para la capa de IA local.
- **No sobre-ingenierizar**: el repo brilla por reglas duras nacidas de fallos reales. Mantener
  esa cultura: cada pieza nueva con su "defensa en código" (gate) y su caso de eval, no features
  por moda.
- **No convertir esto en asesoramiento regulado**: el sistema produce análisis e información, no
  recomendaciones vinculantes (constitución del agente, §3.6 ref). La ejecución es siempre humana.
- **Mantener Markdown donde aporta**: tesis y deep dives siguen siendo Markdown; la DB y la wiki
  los complementan, no los entierran.
- **Decisión abierta**: ¿se quiere alguna vez una UI web (estilo FinAI) sobre estos datos, o el
  canal sigue siendo solo Telegram + r-files? Afecta a si Postgres debe ser parcialmente cloud.

---

## 15. Quick wins (se pueden hacer ya, antes de la DB)

Cosas de alto valor y bajo coste que no requieren toda la infraestructura (estado revisado
2026-06-03):

1. **`risk_gate.py` sobre lo que ya existe** (el de mayor valor ahora): un YAML
   `tools/data/risk-rules.yaml` (espejo del risk budget) + un gate que valide el `size_pct`, SL/TP
   y R:R que **ya llevan los trades en `participants.json`** antes de recomendar. Convierte prosa
   en defensa ejecutable sin DB. *(El dato de riesgo por trade ya está; falta el cumplimiento.)*
2. **Escalado en `participants.json`**: los trades ya tienen `entry/target/stop`; ampliar el
   esquema a **tramos** de entrada/salida (listas) para tener entradas/salidas escaladas. Mínimo
   cambio sobre lo existente. *(Parcial: hoy es un único nivel por campo.)*
3. **Radar v0 sobre las watchlists JSON existentes** (~140 tickers) reutilizando `technical.py` y
   `valuation.py`, que **alimente `temas.json`** (ya consumido por la web), antes del universo
   completo en DB.
4. **Golden set de evals** a partir de los fallos ya documentados (pre-market 2026-05-15,
   release/call earnings, prompt injection, ticker mal identificado `7937.T` de REGLA #19):
   empezar a versionarlos como casos de test.
5. **Envolver 2-3 scripts como herramientas MCP** con contrato idempotente (incluido
   `finfreedom_notes_sync.py`, que ya tiene un contrato claro de eventos), para preparar la
   orquestación Hermes.
