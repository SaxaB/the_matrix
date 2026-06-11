# Diseño del sistema unificado (greenfield) sobre Beelink EQR6

> **Documento canónico del proyecto.** Unifica todo lo decidido: objetivos, arquitectura,
> decisiones y plan. **Supera y absorbe** al antiguo `PLAN-MEJORAS-FINANCIAL-FREEDOM.md` (queda
> deprecado) y **fold-ea** los patrones de `arquitectura_referencia_sistema_agentes_inversion.md`
> (que queda como fondo conceptual, alineado a este diseño).
>
> Diseño desde cero (no es una migración ni un parche). Mezcla lo mejor de **financial-freedom**
> (el cerebro de agentes, las fuentes, las reglas duras, Telegram) y **FinAI** (el cliente Next.js
> + móvil, el modelo de datos de mercado, los ETL SEC/Yahoo, el risk score), sobre un **único host
> autoalojado**: Beelink EQR6 (Ryzen 5 6600U, 6c/12t, 24 GB, 500 GB SSD).
>
> **Decisiones de fondo (cerradas 2026-06-04):**
> - **Runtime: Hermes + APIs de modelo** (pago por token), no Claude Code por suscripción. Por qué:
>   Apéndice B. Claude Code y Codex se usan **solo para construir** el sistema.
> - **Sin Ollama por ahora**: los modelos son **APIs públicas** (Anthropic/OpenAI). Hueco reservado
>   para inferencia local (Jetson) en el futuro, sin rediseño (Apéndice A).
> - **Todo self-hosted en el EQR6**: nada de **Supabase cloud**, **Vercel** ni **GitHub Actions**.
>   El antiguo plan sobre el mini PC **Intel N150** queda descartado (lo sustituye el EQR6).
> - **El cliente (web + app móvil) evoluciona a un dashboard genérico de control de agentes**.
>   La **web** (Next.js) se self-hostea en el mini PC; la **app móvil** (Expo/React Native) consume
>   la misma API y Postgres vía Supabase. **FinAI** (cartera, mercado, radar) es la **primera sección**
>   de ese cliente, no el producto entero. Cada dominio de agente (viajes, IoT, BYD...) añade su
>   sección al mismo shell (§6bis).
> - **Planes de emprendimiento** (gastronomía española en Tailandia, canal YouTube provincias TH):
>   documento de negocio en `Mejoras/plan_negocio_v2_ES_TH.pdf`; agente **P11** (§14.12).
>
> Convención: español, fechas ISO `YYYY-MM-DD`, sin guion largo U+2014. Redacción en **nosotros**
> (equipo/proyecto). Versión 2026-06-10.

---

## Visión y objetivos

**Qué es.** Un **orquestador de agentes autoalojado** con un **catálogo de proyectos** (§Catálogo):
cada fila P1-P11 es un agente o integración con el **mismo peso arquitectónico**. No es "una app de
finanzas con cosas pegadas": es una **plataforma de agentes** con dashboard **web y móvil**, canales de chat y
dominios especializados.

**Orden de construcción, no de importancia.** **Finanzas (P1)** es el **primer proyecto** que
montamos (F3-F7) porque reutiliza financial-freedom + FinAI y da valor al grupo pronto. Calendario,
viajes, IoT, BYD, vault, cultivos, emprendimiento y el resto (P2-P11) son **proyectos iguales** en el catálogo; solo entran después
(F8+) por dependencias y prioridad, no porque sean "secundarios".

**Objetivos de plataforma (transversales a todos los agentes):** observabilidad + evals como CI,
control de coste por token, autonomía progresiva con guardrails, privacidad (datos sensibles no
salen del host; PII nunca a APIs), dashboard modular (§6bis), canales desacoplados y **loops como
unidad de trabajo** (§5quater).

**Objetivos de cada agente:** en el **catálogo**, subsección *Objetivos por proyecto* (P1-P11). No
hay un bloque aparte que eleve finanzas sobre el resto.

---

## Catálogo maestro de proyectos (agentes, integraciones y canales)

Índice único de **todo lo que el sistema debe incorporar**: agentes por dominio, integraciones de
hardware/servicios y canales de interacción. El detalle operativo de cada uno sigue en las secciones
referenciadas; aquí va la **foto completa**.

**Leyenda:** tipo = `agente` (dominio con tools MCP), `integración` (conector a servicio/coche),
`canal` (interfaz usuario, no es un agente). Dueño = **grupo** (inversión compartida) o **personal**
(solo tuyo).

### Resumen por fases (orden de construcción)

| Fase | Qué entra |
|---|---|
| **F1-F2** | Datos + dashboard **web** (primera sección: Finanzas / FinAI) |
| **F4** | App **móvil** v1 (misma sección Finanzas + shell; §6bis) |
| **F3-F7** | Cerebro + **P1 Finanzas** (primer agente del catálogo) + Telegram |
| **F8** | **P2-P7, P9-P10** (agentes personales del catálogo) + secciones del dashboard |
| **F9+** | C3 app chat, P8 trading bot, **P11 emprendimiento**, refinamientos |

> Finanzas va primero en el calendario, **no** en la jerarquía: P2-P11 usan el mismo patrón
> (`domains/` + MCP + sección dashboard).

### Tabla completa

| # | Proyecto | Tipo | Fase | Ruta / dominio | Dueño | Autonomía | Detalle |
|---|---|---|---|---|---|---|---|
| **P0** | **Orquestador Hermes** | plataforma | F3 | `apps/agent/core/` | ambos | L0-L2 | §5, §5quater, §14.1 |
| **P1** | **Finanzas** (briefings, valoración, técnico, Step 0) | agente | F3-F7 | `domains/finance/` | grupo | L1-L2 | §5, §9bis, F3-F7 |
| **P1a** | Gestor de cartera (posiciones, cash, PnL, exposición) | capacidad de P1 | F4 | tools `portfolio` | grupo | L1 | §9bis.1 |
| **P1b** | Motor de riesgo + trade plans (sizing, SL/TP, escalado) | capacidad de P1 | F4 | tools `risk_engine`, gate `risk_gate` | grupo | L2 | §9bis.2 |
| **P1c** | Radar / screener semanal (lista de compra) | capacidad de P1 | F5 | tools `radar` | grupo | L2 | §9bis.3 |
| **P1d** | Decisión de inversión (LangGraph + HITL) | capacidad de P1 | F6 | grafo en `finance/` | grupo | L2 (rojo si ejecuta) | §9bis.4, §8.2 |
| **P1e** | Memoria / LLM Wiki (tesis, threads, temas) | capacidad de P1 | F6 | `knowledge_pages` | grupo | L1 | §9bis.5 |
| **P2** | **Google Calendar** | agente | F8 | `domains/calendar/` | personal | ámbar | §14 |
| **P3** | **Tareas / to-dos** | agente | F8 | `domains/tasks/` | personal | ámbar | §14 |
| **P4** | **Viajes / movilidad** (check-in vuelos + road trips) | agente | F8 | `domains/travel/` | personal | ámbar | §14.7 |
| **P5** | **Control IoT del hogar** (cámaras, sensores, luces, clima) | agente | F8 | `domains/iot/` | personal | verde/ámbar | §14.8 |
| **P6** | **Reporte de 90 días** (y similares periódicos) | agente | F8 | `domains/reports/` | personal | L1 | §14 |
| **P7** | **Integración BYD** (estado coche, carga, clima, ubicación) | integración | F8 | `domains/car/` + MCP | personal | verde/ámbar | §14.9, §7ter |
| **P8** | **Bot de trading automático** (MetaTrader / IBKR) | agente | F9+ | `domains/trading_bot/` | personal/grupo | **rojo** | §14.5, §7ter |
| **P9** | **Vault documental** (pasaporte, permisos, seguros, docs importantes) | agente | F8 | `domains/vault/` + MCP | personal | verde/ámbar | §14.10, §7ter |
| **P10** | **Cultivos / huerto** (riego, abono, siembra, fotos, recomendaciones) | agente | F8 | `domains/cultivos/` + MCP | personal | verde/ámbar | §14.11, §7ter |
| **P11** | **Emprendimiento** (planes de negocio y proyectos propios) | agente | F9+ | `domains/emprendimiento/` + MCP | personal | verde/ámbar | §14.12 |
| **P11a** | Gastronomía española artesanal (Surat Thani, TH) | venture de P11 | F9+ | plan: `Mejoras/plan_negocio_v2_ES_TH.pdf` | personal | ámbar | §14.12.1 |
| **P11b** | Canal YouTube: 77 provincias TH (viaje + comida local) | venture de P11 | F9+ | plan: §14.12.2 (doc pendiente) | personal | verde/ámbar | §14.12.2 |
| **C1** | **Telegram** (grupo de inversión) | canal | F3 | `apps/agent/core/gateway/telegram` | grupo | n/a | §6 |
| **C2** | **Dashboard cliente** (web + app móvil; FinAI = sección Finanzas) | canal | F2 (web) → F4 (móvil) → F8+ | `apps/client/` | grupo (+ tú) | n/a | §6, §6bis, §4bis |
| **C3** | **Chat personal** (módulo en app móvil; sustituto Telegram para ti) | canal | F9+ | `apps/client/mobile/` (tab Chat) | personal | n/a | §14.6 |

### Objetivos por proyecto (agentes P1-P11)

Misma plantilla para todos: qué debe lograr cada agente. Finanzas (P1) es el **primer proyecto a
implementar**, no un nivel aparte del sistema.

**P1 Finanzas** (grupo, F3-F7, §9bis):

1. Responder al grupo (Telegram + sección Finanzas del dashboard) con briefings, valoraciones,
   técnico y gestión de posiciones, con **datos en vivo** y **anclado a posiciones reales**.
2. **Gestor de cartera** (P1a): posiciones, cash, PnL, exposición en Postgres.
3. **Gestión de riesgo ejecutable** (P1b): sizing, entradas/salidas escaladas, SL/TP, R; `risk_gate`.
4. **Radar/screener semanal** (P1c): lista de compra rankeada.
5. **Decisión con LangGraph + HITL** (P1d): propone, nunca ejecuta solo.
6. **Memoria que compone** (P1e): LLM Wiki (tesis, threads, temas).

**P2 Calendario:** crear/mover eventos, recordatorios, resumen del día (§14).

**P3 Tareas:** gestionar listas, recordar, cerrar tareas (§14).

**P4 Viajes / movilidad:** check-in de vuelos; road trips BYD con ruta, landmarks, pernoctas y
carga (§14.7).

**P5 IoT hogar:** leer/actuar sobre cámaras, sensores, luces, clima vía Home Assistant (§14.8).

**P6 Reportes:** informes periódicos (p. ej. 90 días) (§14).

**P7 BYD:** estado batería, carga, preclimatización, ubicación; alimenta P4 y C3 (§14.9).

**P8 Trading bot:** ejecución vía MetaTrader/IBKR; paper primero; rojo por defecto (§14.5).

**P9 Vault documental:** almacenar y organizar documentos personales importantes (pasaporte, permiso
de trabajo, seguro médico, contratos, DNI, etc.); recordar caducidades; responder en chat con
**metadatos** (no mandar el PDF a la API del modelo); alimentar P4 (viajes) con fechas de validez
(§14.10).

**P10 Cultivos / huerto:** gestionar cultivos (macetas, bancales, invernadero); planificar y recordar
**riego**, **abono**, **siembra/trasplante** y cosecha; volcar tareas al **Google Calendar** (P2);
analizar **fotos de evolución** (salud, plagas, crecimiento); recomendar acciones según estación,
clima y historial; opcionalmente leer sensores de **IoT** (P5) para ajustar riego (§14.11).

**P11 Emprendimiento:** acompañar **planes de negocio y proyectos propios** con seguimiento de
hitos, KPIs, tareas y recordatorios; dos ventures iniciales documentados:

- **P11a Gastronomía española (TH):** negocio artesanal en Surat Thani (embutidos, quesos, aceite,
  importación); fuente canónica `Mejoras/plan_negocio_v2_ES_TH.pdf` (§14.12.1).
- **P11b YouTube provincias Tailandia:** recorrer las **77 provincias**, un video de **viaje + comida
  local** por provincia, documentando platos típicos; plan en §14.12.2 (sinergia con **P4** viajes).

### Árbol de dominios y canales (visión completa)

```
apps/
├── client/                      # C2: dashboard web + app móvil (mismo shell y secciones)
│   ├── web/                     #   UI Next.js (F2): layout, rutas, componentes solo web
│   ├── mobile/                  #   UI Expo (F4+): tabs, pantallas, componentes solo RN
│   ├── shared/                  #   TS puro importado por web y mobile (sin UI de plataforma):
│   │                            #   tipos alineados con Postgres, cliente Supabase, auth,
│   │                            #   hooks de datos (Realtime), formatters precio/fecha/%
│   └── sections/                #   lógica por dominio (queries, mappers, validación Zod):
│       ├── finance/             #   P1 FinAI: cartera, radar, tesis, threads, ficha valor (F2/F4)
│       ├── calendar/            #   P2: agenda Google (F8)
│       ├── tasks/               #   P3: to-dos (F8)
│       ├── travel/              #   P4: check-in vuelos, road trips (F8)
│       ├── iot/                 #   P5: sensores, cámaras, luces, clima (F8)
│       ├── reports/             #   P6: informes periódicos (90 días, etc.) (F8)
│       ├── car/                 #   P7 BYD: batería, carga, preclimatización, ubicación (F8)
│       ├── vault/               #   P9: documentos, caducidades, categorías (F8)
│       ├── cultivos/            #   P10: huerto, riego, abono, fotos, calendario (F8)
│       └── emprendimiento/      #   P11: planes de negocio, KPIs, ventures (F9+)
├── agent/
│   ├── core/                    # P0: Hermes, router, gates, API de chat, gateway Telegram
│   └── domains/
│       ├── finance/             # P1 (+ P1a..P1e)
│       ├── calendar/            # P2 (P10 riego; P11 hitos; P11b rodajes)
│       ├── tasks/               # P3
│       ├── travel/              # P4 (P11b rutas provincias; usa P7, P9)
│       ├── iot/                 # P5 (P10 humedad / riego)
│       ├── reports/             # P6
│       ├── car/                 # P7: integración BYD
│       ├── vault/               # P9: vault documental
│       ├── cultivos/            # P10: gestión de cultivos y huerto
│       ├── emprendimiento/      # P11: emprendimiento (P11a gastro ES, P11b YouTube TH)
│       └── trading_bot/         # P8
```

**`shared/`** = lo que **web y mobile comparten sin copiar**: tipos, cliente Supabase, sesión,
suscripciones Realtime, hooks de lectura (`useHoldings`, `useAgentStatus`...) y utilidades de
formato. No lleva JSX ni componentes visuales (cada plataforma pinta distinto).

**`sections/`** = lo **específico de cada dominio agente** pero **independiente de la plataforma**:
consultas a Postgres, transformación fila→view-model, schemas de formulario. `web/` y `mobile/`
importan desde aquí y solo implementan la capa visual.

### Notas transversales del catálogo

- **Un mensaje, un cerebro**: Hermes (P0) clasifica intención y enruta al dominio correcto (§14.1).
- **Dashboard modular (web + móvil)**: C2 empieza en **web** (F2) con la sección **Finanzas** (código
  FinAI); la **app móvil** (F4) replica shell y secciones. Cada dominio de agente (viajes, IoT,
  BYD...) añade su sección en ambos clientes (§6bis).
- **Canales desacoplados**: Telegram (C1), dashboard cliente (C2) y chat personal (C3, tab en
  móvil) consumen la **misma API de chat** del core; añadir sección o canal **no rediseña** los
  agentes (§6, §14.6).
- **Privacidad**: P1/C1 = grupo; sección **Finanzas** de C2 = grupo. P2-P7, **P9-P11** y sus secciones en C2 +
  C3 = personal (schema + RLS, §14.3). **P9 (vault)** e IoT (P5) y BYD (P7): datos muy sensibles,
  **nunca** a APIs de modelo; ficheros cifrados en el host (§14.10). **P10 (cultivos)**: fotos del
  huerto pueden ir a **visión por API** con consentimiento o **local** (Jetson); sin geolocalización
  en prompts si no hace falta (§14.11). **P11 (emprendimiento)**: planes de negocio y métricas
  privados; contenido publicable (YouTube) separado en sub-venture P11b.
- **BYD en dos capas**: **P7** (integración: leer/actuar sobre el coche) alimenta a **P4** (viajes:
  road trips con puntos de carga) y a **C3** (tab Chat de la app móvil en el head unit BYD).
- **Línea roja**: P8 (trading bot) y cualquier ejecución que mueva dinero = HITL obligatorio (§8.2).
- **Plataformas externas**: matriz de acceso IBKR, BYD, KBank, X, etc. en §7ter.

---

## 0. Principios de diseño

1. **Un solo host, todo en Docker Compose.** El EQR6 corre la web, la base de datos, el cerebro de
   agentes, los ETL y los crons. Nada en cloud salvo las APIs de modelos y las fuentes de datos.
2. **APIs de modelos, no inferencia local (por ahora).** Sin Ollama. Esto libera ~6-7 GB y
   simplifica. El sistema se diseña para **enchufar Ollama después sin rediseñar**: la elección de
   modelo es configuración (router de modelos), no arquitectura.
3. **Privacidad primero (REGLA #7 de financial-freedom).** Sin modelo local, los prompts salen a
   APIs externas, así que el saneo de PII es **obligatorio antes de cada llamada**: se mandan
   tickers, tesis y números, nunca nombres reales, user_ids ni sesgos atribuidos. Ver §9.
4. **Una sola base de datos como fuente de verdad.** Postgres concentra mercado, cartera, perfiles
   y memoria. La web lee de ahí en runtime (se elimina el build estático + JSON sueltos del
   finfreedom actual). El cerebro escribe ahí.
5. **Defensa en código sobre confianza en el LLM.** Se heredan los gates de financial-freedom
   (`source_gate`, `risk_gate`, lint de Telegram) y se añaden evals como gate (cultura del repo).

---

## 1. Qué tomamos de cada proyecto

| Pieza | Origen | Qué aporta |
|---|---|---|
| **Cliente web + móvil** (Next.js + Expo; sección Finanzas = FinAI) | **FinAI** | UI español, onboarding, cartera, ficha de valor: **primera sección**, no el producto entero |
| **Modelo de datos de mercado** (`us_symbols`, `sec_edgar_metrics`, `yahoo_eod_bars`, `yahoo_asset_snapshot`) | **FinAI** | esquema probado para fundamentales + EOD + snapshot |
| **ETL SEC + Yahoo + risk** (TS, `scripts/etl/`) | **FinAI** | ingesta probada del universo S&P ∪ NDX ∪ Dow (~500), backfill on-demand |
| **`finai_risk_score`** (5-95 determinista) | **FinAI** | input de riesgo por activo, reutilizable |
| **Cartera con `CASH-{CCY}`** + venta a efectivo | **FinAI** | modelo de holdings y cash |
| **Cerebro de agentes** (decision gate, Step 0, research pipeline) | **financial-freedom** | la orquestación cognitiva accionable |
| **Fuentes de sentimiento/narrativa** (X Lists, Reddit, Citrini, Cárpatos) | **financial-freedom** | lo que FinAI no tiene |
| **REGLAS DURAS** (privacidad, datos en vivo, sanity checks, fair value DCF, formato Telegram) | **financial-freedom** | la cultura curada por fallos reales |
| **Gateway de Telegram** + gates en código (`source_gate`, lint) | **financial-freedom** | el canal del grupo y la defensa automática |
| **Motor de riesgo operativo + trade plans + radar/screener** | **financial-freedom** (PLAN-MEJORAS) | sizing, SL/TP, entradas/salidas escaladas, lista de compra |
| **Threads / Temas / Tesis** (conocimiento que compone) | **financial-freedom** | semilla de la wiki |
| **Orquestación Hermes + LangGraph + N8N, observabilidad, evals, autonomía L0-L4** | **arquitectura de referencia** | la madurez agéntica |

**Lo que NO copiamos de FinAI**: Supabase **cloud**, Vercel y GitHub Actions. Todo eso pasa a
self-hosted en el EQR6 (ver §2 y §7).

---

## 2. Topología en el EQR6 (Docker Compose)

```
                         Cloudflare Tunnel (cloudflared)
                                    │  (sin abrir puertos)
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                         ▼
       web (Next.js)          telegram gateway          (futuro: A2A externo)
            │                       │
            └──────────┬────────────┘
                       ▼
            ┌─────────────────────┐        ┌──────────────────────┐
            │  agent (Python)     │  MCP   │  etl (TS, FinAI)      │
            │  orquestador +      │◀──────▶│  SEC / Yahoo / risk   │
            │  tools + gates +    │        └──────────┬───────────┘
            │  LangGraph          │                   │
            └──────────┬──────────┘                   │
                       ▼                              ▼
            ┌───────────────────────────────────────────────────┐
            │            Postgres (fuente de verdad única)        │
            │  mercado · cartera · perfiles · memoria/wiki        │
            └───────────────────────────────────────────────────┘
   n8n (crons/alertas)   ·   langfuse+clickhouse (fase 2)   ·   qdrant (fase 2)
```

**Servicios (contenedores):**

| Servicio | Imagen base | Rol | Fase |
|---|---|---|---|
| **Supabase self-host** (`postgres` + `gotrue` + `postgrest` + `realtime` + `studio`) | stack `supabase` | almacén único + Auth/RLS + push en vivo | F0 |
| `web` | Next.js 16 (`apps/client/web/`) | dashboard web; FinAI = sección Finanzas | F2 |
| `agent` | Python + **Hermes** | orquestador + tools deterministas (MCP) + Telegram + gates + LangGraph | F3 |
| `etl` | Node 20 (scripts TS de FinAI) | ingesta SEC/Yahoo/risk, lanzado por scheduler | F1 |
| `n8n` | `n8nio/n8n` | crons deterministas y alertas de umbral | F1 |
| `cloudflared` | `cloudflare/cloudflared` | tunnel para web/telegram sin IP pública | F0 |
| `langfuse` + `clickhouse` | self-host | observabilidad (retención corta) | F7 |
| `qdrant` | `qdrant/qdrant` | RAG de noticias/filings | F6 (opcional) |
| ~~`ollama`~~ | - | **fuera por ahora** (hueco reservado, §0.2; futura Jetson, Apéndice A) | futuro |

**Presupuesto de RAM (sin Ollama, 24 GB):** SO+Docker ~3, Postgres ~1-2, web Next.js ~1-2, agent
Python ~2-4, etl (puntual) ~1, n8n ~0.5, langfuse+clickhouse ~3-5 (fase 2). Total cómodo en 24 GB
con margen. El EQR6 va **sobrado** mientras no haya modelo local.

---

## 3. Modelo de datos unificado (un Postgres, cinco dominios)

| Dominio | Tablas (origen) | Notas |
|---|---|---|
| **Mercado** (público) | `us_symbols`, `sec_companyfacts_snapshot`, `sec_edgar_metrics`, `yahoo_eod_bars`, `yahoo_asset_snapshot`, `asset_quotes` | calcado de FinAI; lo llena el ETL (§7) |
| **Cartera** | `holdings`/`positions`, `portfolio_operations`, `cash_balances` (`CASH-{CCY}`), `portfolio_daily_values`, `trade_plans`, `risk_rules` | FinAI (holdings + cash) ampliado con trade plans y reglas de riesgo de financial-freedom |
| **Usuarios/perfil** | `user_profiles` (perfil de riesgo), auth | de FinAI; ver decisión de auth en §4 |
| **Memoria/conocimiento** | `knowledge_pages` (tesis/temas/threads), `market_events`, `agent_events`, `agent_skills` | LLM Wiki + memoria episódica de la referencia |
| **Privado/local** | sesgos, perfiles de traders, citas privadas | RLS estricta o fuera de la web; **nunca** a APIs externas (§9) |

Cambio importante respecto al finfreedom actual: **Threads, Temas y Tesis dejan de ser JSON
estáticos** (`tools/data/finfreedom/*.json`) y pasan a **tablas en Postgres** que la web lee en
runtime. Más potente (consultas, precio en vivo server-side, edición transaccional) y elimina las
carreras de build/deploy.

---

## 4. Auth y modelo de acceso (DECIDIDO 2026-06-04)

**Decisión: Supabase self-hosted con login por miembro.** Es lo que reaprovecha más código de
FinAI y da las features de inversor particular.

- **Stack Supabase self-host** en el EQR6 (Docker): Postgres + **GoTrue** (auth) + **PostgREST** +
  **Realtime** + Studio. El cliente Supabase de FinAI se reutiliza en la **sección Finanzas** del
  dashboard (ya asume auth y RLS).
- **Login por miembro** (email + Google OAuth), con **perfil de riesgo** y **cartera personal** por
  usuario protegidos por **RLS** (`auth.uid()`).
- **Datos de grupo** (posiciones declaradas anónimas, tesis, threads, temas, radar, lista de
  compra) en tablas de grupo legibles por todos los miembros autenticados, escritas por el cerebro
  de agentes (ver §4bis). Los **sesgos y la identidad** nunca entran aquí (REGLA #7).
- El **Realtime de Supabase** es la pieza que hace que **web y app móvil** se actualicen **en vivo**
  cuando el agente escribe (ver §4bis). Esto sustituye al build estático + deploy del finfreedom actual.

---

## 4bis. Cómo el cerebro actualiza el cliente (web + móvil) dinámicamente

Requisito que marcaste: los agentes deben **actualizar web y móvil dinámicamente**. La pieza que lo
resuelve no es el lenguaje del ETL, sino el **contrato de datos + push en vivo**:

```
Agente (Python)  --escribe fila-->  Postgres  --Supabase Realtime (websocket)-->  Web / App móvil
                  psycopg / asyncpg                                                 se actualiza solo
                  (cliente Postgres)                                                (sin rebuild)
```

1. **Postgres es el contrato.** El cerebro y los clientes (web, móvil) no se llaman entre sí; todos
   hablan con la misma DB. El agente escribe en las tablas de grupo/conocimiento (radar, tesis,
   threads, temas, snapshot de cartera) y los clientes leen de ahí.
2. **El agente escribe con un cliente Postgres estándar** (`psycopg`/`asyncpg`) o SQL directo, desde
   su **capa de acceso a datos** (`apps/agent/data`). No usa el SDK de Supabase: solo escribe filas
   respetando el esquema. El push en vivo (punto 3) **salta igual**, porque Realtime escucha el WAL
   de Postgres, no depende del cliente que haga el `INSERT`. No necesita tocar el código del cliente.
3. **Web y móvil se actualizan en vivo con Supabase Realtime** (aquí **sí** entra Supabase, pero en
   el **lado cliente**, no en el agente): el servicio `realtime` del stack lee el WAL de Postgres y,
   cuando el agente inserta/actualiza una fila, lo emite por websocket; el **frontend** web y la
   **app móvil** (cliente `@supabase/supabase-js`) están suscritos y repintan la UI **sin rebuild
   ni deploy** (justo lo que falta en el finfreedom actual de JSON + build estático).
4. **Propiedad de escritura por dominio** (evita choques): el **agente** escribe mercado,
   conocimiento, radar y snapshots; el **usuario** escribe su perfil y su cartera personal desde la
   web o la app móvil (Server Actions / mutaciones Supabase). Nadie pisa el dominio del otro.

### Decisión de lenguaje del ETL (resuelta con este criterio)

Como la actualización dinámica del cliente va por **Postgres + Realtime** (no por el ETL), el
lenguaje del ETL es **independiente** de ese requisito. Por tanto:

- **Mantener los ETL de mercado (SEC/Yahoo/risk) en TypeScript** (los de FinAI, ya probados, que
  comparten tipos y cliente Supabase con `apps/client/web/`). Es el camino de menor riesgo.
- **El cerebro escribe en Python** las tablas que alimentan web y móvil en vivo (lo que de verdad pediste).
- **Un único backfill compartido**: `ensureMarketDataForTicker` (TS) se expone como un **endpoint
  interno** que tanto la web (al añadir un holding) como el agente (al analizar un ticker sin
  datos) invocan. Así no se duplica el ETL en dos lenguajes; el agente Python pide el backfill por
  HTTP interno y luego lee el resultado de Postgres.

Resumen: **TS para ingerir mercado, Python para que el agente escriba lo que web y móvil muestran en
vivo, Postgres + Realtime como pegamento.** Si en el futuro molesta el bilingüismo, se porta el ETL
a Python sin tocar el contrato.

---

## 5. El cerebro de agentes (Python)

- **Orquestador**: **Hermes desde el inicio** (sin orquestador puente provisional). Clasifica la
  intención, enruta al dominio y dispara el pipeline de research, que se **implementa nuevo** en el
  monorepo tomando como base la lógica de `research_pipeline.py` de financial-freedom (se reescribe,
  no se arrastra el script actual).
- **Decision gate + Step 0**: igual que hoy, pero **Step 0 lee la cartera real de Postgres** (no
  prosa de `bitacora/`).
- **Tools deterministas como MCP**: `valuation`, `technical`, `finnhub`, `x_lists`, `reddit`,
  `citrini`, `carpatos`, `portfolio`, `radar`, `risk_engine`, `web_scrape_structured` (§7bis).
  Contrato explícito e idempotente.
- **LangGraph para decisiones de inversión**: grafo garantizado
  `market_data → historical_context (wiki) → risk_sizing → tax_impact → synthesis → human_approval`.
- **Gates en código**: `source_gate` (cobertura de fuentes), `risk_gate` (sizing, SL/TP, R), lint
  de Telegram. Heredados de financial-freedom.
- **Router de modelos (API)**: Claude para síntesis/decisión; un modelo barato para clasificación
  y embeddings. Config, no código. Aquí se enchufaría Ollama el día de mañana.

---

## 5bis. Quién construye vs quién ejecuta (Claude Code, Codex y los modelos)

Distinción clave para no confundir herramientas de desarrollo con los agentes del producto:

```
CONSTRUIR (en el portatil, con Cursor)        EJECUTAR (en el Beelink EQR6, 24/7)
   Claude Code ─┐                                apps/agent (Python)
                ├─> escriben el monorepo            │  llama por API a
   Codex       ─┘   (web, agent, etl, db)           ▼
                                              Claude / GPT (modelo)
   (construyen y se van)                       │ lee/escribe Postgres ─Realtime─> web
                                               └ responde Telegram
```

| Nombre | Qué es | Cuándo |
|---|---|---|
| **Claude Code** | herramienta de desarrollo (agente que programa en el repo) | construir |
| **Codex** | herramienta de desarrollo (equivalente de OpenAI) | construir |
| **Claude / GPT (API)** | el modelo que razona, invocado por `apps/agent` | ejecutar |
| **Agentes del sistema** (orquestador, mercado, decisión) | código Python propio que llama a la API | ejecutar |

- **Construir**: Claude Code como par-programador principal; Codex para tareas largas, en paralelo
  o de validación (segunda opinión). Se alternan según la tarea; no es "uno hace la web y otro los
  agentes".
- **Ejecutar**: los agentes son **código propio**, no instancias de Claude Code. En runtime se
  llama directamente a las **APIs de modelo** vía el **router de modelos** (§5): Claude para
  síntesis/decisión, un modelo barato para clasificación/embeddings, y mañana la Jetson para lo
  sensible a privacidad (Apéndice A).

### Autenticación de modelos: API keys (cambio respecto al repo actual)

El `financial-freedom` actual **no usa API keys de modelo**: el cerebro **es Claude Code** corriendo
por **suscripción** (la sub del admin, login del CLI), Codex se usa por su sub vía skill
`codex-consult` (gpt-5.5), y Gemini por la skill `gemini-consult-api` (conceptual, REGLA #14). Las
únicas claves del repo (`secrets.env`) son de **datos**: `FINNHUB_API_KEY`, `APIFY_KEYS`,
`FMP_KEYS`, `JINA_KEYS`, `TELEGRAM_BOT_TOKEN`. No hay `ANTHROPIC_API_KEY` ni `OPENAI_API_KEY`.

En el **sistema nuevo** esto cambia a propósito: el runtime es código propio, así que los modelos se
consumen con **API keys de pago por token** (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY` en el
`secrets.env` del host), no con la suscripción de un CLI interactivo. Implicaciones:

- **Control de coste** por token (encaja con `cost_budget_usd` y límites de §8); una suscripción de
  CLI no está pensada para uso headless 24/7.
- **Router de modelos** elige el modelo por tarea (caro solo cuando hace falta).
- Claude Code y Codex siguen ahí, pero **solo para construir/mantener** el sistema, no como runtime.

---

## 5ter. Router de modelos y presupuesto de coste

El runtime no llama "a Claude" a secas: un **router** elige el modelo por tarea (config, no código)
y un **presupuesto** evita sorpresas de factura. Es lo que hace viable el pago por token.

### 5ter.1 Router por tarea (`infra/models.yaml`)

| Tarea | Modelo sugerido | Por qué |
|---|---|---|
| Clasificar intención / routing | barato (Claude Haiku, GPT-mini) | alto volumen, decisión simple |
| Resumir fuentes (Reddit/X/Cárpatos) | barato-medio | volumen, no es la cara visible |
| Scoring del radar | medio | volumen medio, criterios acotados |
| **Scraping estructurado web** (§7bis) | barato (Haiku/GPT-mini) | extracción con schema Zod; volumen puntual |
| **Síntesis del briefing** | fuerte (Claude Sonnet) | calidad de redacción, lo lee el grupo |
| **Nodo de decisión** (comprar/vender, LangGraph) | fuerte (Sonnet/Opus) | consecuencias económicas, máxima calidad |
| Embeddings (RAG/memoria) | embeddings baratos (text-embedding-3-small / Voyage) | barato, en lote |
| Compactación de memoria (nocturna) | medio, o **local en Jetson** (futuro) | en lote, sensible a privacidad |

La config mapea `tarea -> {provider, model, max_tokens, temperature, fallback}`. Cambiar a Ollama
mañana = cambiar el `provider` de una fila, sin tocar el código (encaja con §0.2 y Apéndice A).

### 5ter.2 Límites y presupuesto (de la referencia §3.3.2)

- **`cost_budget_usd`** por tarea y **tope diario agregado** (ej. 0,50 USD/tarea, tope diario
  configurable): al superarlo, **pausa el agente y avisa por Telegram**.
- **`max_tool_calls`**, **`max_iterations`**, **`wall_clock_timeout`** por tarea: cortan bucles.
- **Atribución de coste** por span OTel (tokens + coste) en Langfuse (§8): se ve qué tarea gasta.
- **Cheap-first**: clasificar/filtrar con modelo barato; escalar al fuerte solo cuando aporta.
- **Caché y dedupe**: cachear respuestas deterministas y fetches de fuentes (ya se hace), no repetir
  llamadas idénticas.

### 5ter.3 Orden de magnitud (medir, no asumir)

Para un grupo pequeño (briefing diario + algunas consultas + radar semanal), con routing
**cheap-first**, el gasto esperable está en el rango de **decenas de USD/mes**, comparable o por
debajo de una suscripción de CLI, pero con control fino. Sin routing (modelo fuerte en cada
mensaje) se dispara. Por eso el router y los topes son parte del diseño, no un extra. Cifra real: se
instrumenta con Langfuse desde el día 1 y lo ajustamos.

---

## 5quater. Loops como unidad de trabajo (práctica 2026)

Referencia: el debate *"design loops that prompt your agents"* (Steinberger/Cherny, junio 2026).
No cambia nuestra arquitectura: **la nombra**. Hermes + n8n + LangGraph **ya son loops**; aquí
fijamos qué debemos hacer y las mejores prácticas que adoptamos.

### Qué es un loop (en nuestro sistema)

Un **loop** es un programa pequeño (no un prompt suelto) que:

1. **Dispara** al agente o a un sub-paso (modelo + tools).
2. **Lee** el resultado y el estado persistido.
3. **Decide** si ha terminado o qué hacer en la siguiente vuelta (el modelo o un grafo fijo).
4. **Verifica** antes de publicar o persistir (gates, evals).
5. **Para** por hard stops (iteraciones, presupuesto, timeout, sin progreso).

Metáfora útil: **cron + decisión en el cuerpo**. n8n solo con script fijo = cron clásico (ETL
Yahoo/SEC). n8n + Hermes + LLM = loop de verdad (briefing, radar, check-in vuelos).

**No prompteamos briefings a mano cada día.** Diseñamos el loop una vez, con skills y verificación,
y lo dejamos correr en el Beelink.

### Espectro (dónde encajamos)

| Etapa | Qué es | Nosotros |
|---|---|---|
| ReAct / while simple | modelo + tool en bucle | evitar suelto en producción; solo prototipos |
| Ralph / `/goal` | mismo prompt repetido con anclas | útil al **construir** el repo (Claude Code/Codex), no runtime |
| **Orquestación 2026** | loops programados, estado durable, sub-loops | **Hermes (P0) + LangGraph (P1d) + n8n** |

LangGraph para decisión de inversión = loop **estructurado** (nodos fijos, no while infinito).
Hermes supervisando sub-agentes por ticker = loop que **supervisa otros loops** (arquitectura
referencia §3.3).

### Catálogo de loops (runtime)

Cada fila debe existir como config (`infra/loops.yaml`) + implementación, no como prosa:

| Loop | Trigger | Dominio | Skills / tools | Verificación (gate) | Hard stops |
|---|---|---|---|---|---|
| Briefing diario | n8n cron | P1 | research pipeline, fuentes, síntesis | `source_gate`, lint Telegram | §5ter.2 |
| Radar semanal | n8n domingo | P1c | `radar`, Postgres | `risk_gate` en trade plans | §5ter.2 |
| Decisión inversión | chat / Telegram | P1d | LangGraph | HITL rojo (§8.2) | checkpointer |
| Compactación wiki | n8n nocturno | P1e | resumen memoria | saneo PII (§9) | budget bajo |
| Check-in vuelos | n8n / evento | P4 | aerolínea, calendario | confirmación ámbar | max 3 iter |
| ETL mercado | n8n diario | (datos) | etl TS | validación schema | timeout fijo |

### Mejores prácticas que adoptamos

1. **El loop es la unidad de trabajo, no el prompt.** Definimos intent + stopping behavior + skills;
   el modelo es subrutina.
2. **Skills reutilizables dentro del loop** (MCP idempotentes, constitución por `domains/`, ficheros
   skill con trigger/process/output). Un loop sin skills nombradas solo quema tokens re-derivando.
3. **Feedback en cada vuelta.** Publicar sin gate = loop roto. Briefing sin `source_gate` no sale;
   trade plan sin `risk_gate` no se publica.
4. **Hard stops obligatorios** (§5ter.2): `max_iterations`, `max_tool_calls`, `wall_clock_timeout`,
   `cost_budget_usd`, **detección de no-progreso** (N vueltas sin cambio de estado → parar y avisar).
5. **Estado durable.** Postgres + LangGraph checkpointer; el loop sobrevive a reinicios del
   contenedor.
6. **Cheap-first dentro del loop.** Clasificar y extraer con modelo barato; modelo fuerte solo en
   síntesis/decisión.
7. **Construcción vs runtime separados.** Loops `/loop` o `/goal` de Claude Code/Codex para
   **construir** el monorepo (PRs, CI). Loops Hermes+n8n para **ejecutar** el producto 24/7
   (Apéndice B).

### Qué no hacemos

- Loops sin techo de coste (facturas impredecibles; el artículo lo marca como fallo #1 en producción).
- Un while-true alrededor del LLM sin grafo ni gates (confianza ciega).
- Confundir **construcción** (259 PRs con Claude Code) con **runtime** del grupo (Hermes + API).

---

## 6. Canales de salida

1. **Telegram** (gateway de financial-freedom): briefings, respuestas, alertas proactivas. Mantiene
   formato, gates y reglas actuales. Canal del **grupo** (finanzas).
2. **Dashboard cliente (C2)**: interfaz principal de **control y visualización de todos los agentes**
   en **web** (navegador, self-hosted) y **app móvil** (iOS/Android). No es "la web de FinAI": es un
   **shell genérico** al que cada dominio añade su **sección**. La primera sección es **Finanzas**
   (código y UX de FinAI: cartera, radar, tesis, ficha de valor). Las siguientes (viajes, IoT, BYD,
   calendario...) se montan en web y móvil conforme entren los agentes (§6bis). Ambos leen Postgres
   en runtime + Realtime (Supabase JS).

Los canales están **desacoplados del cerebro** (todos hablan con el mismo agente + Postgres), así
que añadir canales nuevos no es un rediseño. La **app chat personal (C3)** sustituirá Telegram para
tu uso privado en F9+; Telegram se mantiene para el grupo (§Catálogo, §14.6).

El radar (§9bis.3) escribe su lista a Postgres y aparece **a la vez** en Telegram (TL;DR) y en la
**sección Finanzas** del dashboard, sin duplicar lógica.

### 6bis. Dashboard cliente (web + móvil): de FinAI a plataforma de control de agentes

**Decisión de evolución.** FinAI no se tira: su código pasa a ser la **sección Finanzas** dentro de
un cliente más grande (**web + app móvil**). El objetivo a medio plazo es **un solo producto**
desde el que ver y controlar todos los agentes (estado, últimas acciones, datos en vivo), en
escritorio y en el bolsillo, no un portal solo de inversión.

**Stack cliente:**

| Plataforma | Ruta | Cuándo | Despliegue |
|---|---|---|---|
| **Web** | `apps/client/web/` | F2 | Contenedor Docker en EQR6 (Cloudflare Tunnel) |
| **Móvil** | `apps/client/mobile/` | F4 (Finanzas), F8+ (resto secciones) | Build Expo → TestFlight/Play Store; **no** corre en el EQR6 |
| **Compartido** | `apps/client/shared/` (transversal) + `sections/` (por dominio) | F2+ | Ver nota bajo el árbol |

**Arquitectura del frontend (`apps/client/`):**

```
apps/client/
├── web/                      # UI Next.js: layout, rutas, componentes web-only (F2)
├── mobile/                   # UI Expo: tabs (Dashboard, Chat C3, Ajustes), pantallas RN (F4+)
├── shared/                   # TS puro web+móvil: tipos DB, Supabase, auth, hooks Realtime, formatters
└── sections/                 # lógica por dominio (queries, mappers, Zod); P1-P7 + P9-P10
    ├── finance/              # P1 FinAI: cartera, radar, tesis, threads, ficha valor (F2/F4)
    ├── calendar/             # P2: agenda Google (F8)
    ├── tasks/                # P3: to-dos (F8)
    ├── travel/               # P4: check-in vuelos, road trips (F8)
    ├── iot/                  # P5: sensores, cámaras, luces, clima (F8)
    ├── reports/              # P6: informes periódicos 90d (F8)
    ├── car/                  # P7 BYD: batería, carga, ubicación (F8)
    ├── vault/                # P9: documentos, caducidades, categorías (F8)
    ├── cultivos/             # P10: huerto, riego, abono, timeline fotos (F8)
    └── emprendimiento/       # P11: ventures, KPIs, hitos (F9+)
```

**Qué va en cada carpeta:**

| Carpeta | Contenido | Ejemplo |
|---|---|---|
| **`shared/`** | Código idéntico en web y móvil; **sin UI** | `createSupabaseClient()`, tipos `Holding`, hook `useRealtimeTable('radar_items')`, `formatPrice()` |
| **`sections/<dominio>/`** | Lógica del dominio; **sin UI de plataforma** | `fetchPortfolio()`, mapper `row→PortfolioView`, schema Zod de trade plan |
| **`web/`**, **`mobile/`** | Pantallas y componentes nativos de cada plataforma | Tabla cartera en Next.js vs lista en FlatList; ambos importan `sections/finance/` |

Cada sección = **dominio agente** (P1-P7, P9-P11) → tablas Postgres → lectura en runtime → Realtime →
nav item en el shell. Añadir un agente nuevo implica añadir `sections/<dominio>/` + pantallas en
`web/` y `mobile/`, no un producto aparte. **P8 (trading bot)** no tiene sección dashboard de
momento: la operativa vive en el agente + HITL (§14.5).

**Qué muestra el shell (transversal a web y móvil):**

- Login (Supabase), navegación por sección, permisos (grupo vs personal).
- **Estado de agentes**: último briefing, jobs ETL, alertas, coste del día (Langfuse).
- En **móvil**, tab **Chat (C3)** para lo conversacional; el resto de tabs es **datos y control**.

**Roadmap UI:**

| Fase | Web | Móvil |
|---|---|---|
| F2 | Shell + **Finanzas** (FinAI) | — |
| F4 | Finanzas estable | Shell + **Finanzas** (paridad datos; UX adaptada a móvil) |
| F8 | + Viajes, IoT, BYD, Calendario, Tareas, Reportes, Vault, **Cultivos** | + mismas secciones |
| F9+ | Chat web opcional; **Emprendimiento** (P11) | Tab **Chat** completo; ventures P11a/P11b |

---

## 7. ETL y scheduling (host residente, no GitHub Actions)

- **Reutilizamos los ETL de FinAI** (`etl:sec`, `etl:yahoo`, `etl:ticker-risk`,
  `etl:preload-indices`). Como ahora hay **host residente**, no hacen falta GitHub Actions: los
  lanza **n8n** (o systemd timers, o el scheduler de Hermes).
- **Cadencia** (de FinAI + financial-freedom):

| Job | Frecuencia |
|---|---|
| Yahoo incremental + snapshot | diaria, tras cierre US |
| `finai_risk_score` | diaria, tras Yahoo |
| SEC company facts | semanal (`--skip-if-fetched-days 7`) |
| Snapshot diario de cartera | diaria |
| Radar / lista de compra | semanal (domingo) |
| Compactación de memoria/wiki | nocturna (vía API, no Ollama; con saneo de PII) |

- **Backfill on-demand** (`ensureMarketDataForTicker` de FinAI): al añadir un holding o analizar un
  ticker sin datos, dispara SEC + Yahoo + risk de ese ticker.

---

## 7bis. Scraping web estructurado (`llm-scraper`)

Cuando **no hay API** (o FMP/Finnhub no cubren el dato) y WebFetch/Jina no bastan (SPA, HTML
dinámico, layout cambiante), usamos una capa de **scraping estructurado con LLM** inspirada en
[`llm-scraper`](https://github.com/mishushakov/llm-scraper) (TypeScript, Playwright, schema Zod,
Vercel AI SDK).

### Por qué nos encaja

- **Mismo stack TS** que ETL y web: encaja en `packages/scraper/` o servicio HTTP interno que el
  agente Python invoca (mismo patrón que backfill on-demand, §4bis).
- **Schema-driven**: definimos Zod/JSON Schema (precio, fwd PE, filas de tabla...) y el modelo
  extrae **objeto tipado**, no prosa que luego parseamos a mano.
- **Playwright bajo el capó**: renderiza JS como un navegador real; supera páginas que un GET
  simple no ve (SPAs, contenido post-load). Para anti-bot fuerte escalamos a **Camoufox** (REGLA
  #17 / `decision-tree-fuentes.md`), no como default.
- **Modos de entrada** del repo: `markdown`, `text` (Readability), `html`, `screenshot` (multimodal).
  Elegimos el más barato que funcione.
- **Code-generation** (`scraper.generate()`): la primera extracción puede generar un script Playwright
  reutilizable; las siguientes corridas **no llaman al LLM** (compounding de skill del §5quater).

### Árbol de decisión (ampliación del decision-tree)

| Orden | Vía | Cuándo |
|---|---|---|
| 1 | API estructurada (Finnhub, yfinance, SEC, ETL) | siempre primero |
| 2 | WebFetch / Jina Reader | HTML estático, docs, IR |
| 3 | **`llm-scraper`** (Playwright + schema + LLM barato) | SPA, tablas sin API, layout variable (p. ej. forecast stockanalysis.com) |
| 4 | Camoufox | anti-bot real en página **pública** |
| 5 | Apify actor específico | X, Reddit, aerolíneas a escala, login wall propietario |

**No saltamos capas** en sitios normales. **No usamos scraping LLM** si Finnhub/yfinance ya tienen el dato.

### Casos de uso previstos

| Caso | Schema ejemplo | Modelo |
|---|---|---|
| Analyst estimates / forecast (gap FMP) | `{ eps_fy26, revenue_fy26, ... }` | barato (§5ter) |
| Página de aerolínea (check-in P4) | `{ checkin_open, flight, seat }` | barato; ámbar HITL |
| Noticia / filing puntual | `{ title, date, summary }` | barato |
| Página con captcha/login obligatorio | **no** llm-scraper | Apify o sesión manual (cdp-browser) |

### Implementación prevista

```
packages/scraper/              # wrapper nuestro sobre llm-scraper
├── schemas/                   # Zod por fuente (stockanalysis, airline, ...)
├── generated/                 # scripts Playwright auto-generados (git, revisables)
└── run.ts                     # CLI + endpoint HTTP interno

apps/agent/tools/web_scrape_structured/   # MCP: url + schema_name → JSON
```

- **Endpoint interno** (como backfill ETL): `POST /scrape { url, schema, format? }` → JSON.
- **Router**: extracción con Haiku/GPT-mini; nunca Opus para scrape.
- **Caché**: misma URL+schema en ventana TTL → no repetir Playwright+LLM.
- **Observabilidad**: span en Langfuse con coste por scrape.
- **Contenedor**: imagen agent/etl con Playwright browsers instalados (Chromium headless).

### Límites y ética (obligatorio)

- Solo **páginas públicas** o con nuestra sesión autorizada. No diseñamos el sistema para evadir
  paywalls, ToS ni CAPTCHAs de forma agresiva.
- "Saltarnos verificaciones" aquí significa **superar limitaciones técnicas** (JS, DOM dinámico,
  falta de API), no saltar controles legales o de acceso restringido.
- Datos personales scrapeados (vuelos, calendario) → schema privado, RLS; no mandamos HTML crudo a
  APIs si contiene PII (§9).
- Si un sitio bloquea de forma persistente, **declaramos omitido** en el briefing (REGLA #6), no
  reintentamos en bucle infinito.

Referencia externa: [mishushakov/llm-scraper](https://github.com/mishushakov/llm-scraper) (6k+ stars,
Playwright + Zod + multi-provider). Evaluamos integrarlo como dependencia npm, no fork, salvo que
necesitemos hardening para Camoufox.

---

## 7ter. Acceso a plataformas externas

Cómo conectamos el sistema a **servicios de terceros** (brokers, banco, coche, redes sociales).
Patrón único: cada plataforma = **conector MCP** (o tool) con tier de acceso, credenciales en
`secrets.env` (fuera de Git), allowlist por dominio (§14.3) y autonomía acorde (§8).

### Inventario en el repo actual (`financial-freedom`)

| Plataforma | ¿Acceso programático hoy? | Qué hay en el repo |
|---|---|---|
| **IBKR** | **No** | Solo doc operativa: verificar productos operables en la web de IBKR (`tools/docs/acceso-mercados-ibkr.md`). Posiciones del grupo se **declaran a mano** (web/dashboard). El bot **no ejecuta órdenes** (`tools/docs/manual-bot-operacion.md`). Sin `ib_insync`, TWS ni Client Portal API. |
| **X / Twitter** | **Sí (lectura)** | Apify sin login: `x_lists_fetch.py`, `x_user_fetch.py`, `x_search_fetch.py`; keys `APIFY_KEYS` (`secrets.example.env`). Doc: `tools/docs/x-api-apify.md`, REGLA #11. |
| **BYD** | **No** | Solo diseño P7 (§14.9). |
| **Kasikorn Bank (KBank)** | **No** | Sin referencias en el repo. |
| **MetaTrader** | **No** | Solo diseño P8 (§14.5). |
| **Vault documental** | **No** | Solo diseño P9 (§14.10). Sin Paperless-ngx, Vaultwarden ni MinIO en el repo aún. |
| **Cultivos / huerto** | **No** | Solo diseño P10 (§14.11). Sin integración clima, visión ni calendario de huerto aún. |
| **Emprendimiento** | **Parcial** | Plan negocio gastro ES en `Mejoras/plan_negocio_v2_ES_TH.pdf` (P11a). P11b YouTube solo diseño §14.12.2. |
| **Telegram** | **Sí** | Bot API: `TELEGRAM_BOT_TOKEN`; gateway Hermes/Telegram. |
| **Mercado (datos)** | **Sí** | Finnhub, yfinance, Apify (X/Reddit), SEC/Yahoo ETL (FinAI). |

Conclusión: **no tenemos acceso a la plataforma de trading de IBKR** ni a banca/coche; sí tenemos
**lectura de X** vía Apify y **datos de mercado** vía APIs. IBKR hoy es referencia manual + reglas
PRIIPs/operabilidad, no integración.

### Tiers de conexión (cómo resolvemos cada caso)

| Tier | Mecanismo | Cuándo lo usamos | Ejemplos |
|---|---|---|---|
| **T1 API oficial** | REST/WebSocket + OAuth o API key | Existe API estable documentada | IBKR Client Portal, Finnhub, Google Maps/Calendar |
| **T2 MCP propio** | Tool/MCP que envuelve T1 | Contrato idempotente para agentes | `finnhub`, `portfolio_ibkr`, `gcal` |
| **T3 Apify actor** | Scraping social a escala, sin login nuestro | X Lists, Reddit, algunos casos propietarios | `x_lists_fetch`, REGLA #11 |
| **T4 Web estructurado** | Playwright + schema (§7bis) | SPA pública, sin API | stockanalysis forecast, check-in aerolínea |
| **T5 Home Assistant** | Una capa IoT/coche en LAN | Dispositivos domésticos, posible puente BYD/OVMS | P5 IoT, P7 BYD |
| **T6 Sesión propia** | `cdp-browser` / sesión autenticada del usuario | Banca, broker web, contenido privado | Kasikorn, IBKR web si no hay API |
| **T7 Manual / HITL** | Usuario declara en dashboard o confirma | Sin API fiable o datos sensibles | posiciones grupo (hoy), órdenes reales (siempre rojo) |
| **T8 Solo verificación** | URL pública, sin automatizar | Comprobar operabilidad | IBKR products-exchanges (REGLA #19) |

Regla: **subir de tier solo si el inferior no cubre el caso**. API > Apify > scrape > sesión propia.

### Matriz por plataforma (estado + plan)

#### Interactive Brokers (IBKR)

| Aspecto | Detalle |
|---|---|
| **Hoy** | T8: URL productos/exchanges para verificar tickers operables desde UE (PRIIPs, lotes Japón). T7: posiciones declaradas en web/`participants.json`. **Sin lectura de cuenta ni órdenes.** |
| **Lectura de cartera (plan)** | **T1 + T2**: [Client Portal API](https://www.interactivebrokers.com/en/trading/ib-api.php) (REST, OAuth) o **TWS API** vía `ib_insync` en contenedor sidecar en el EQR6 (requiere IB Gateway/TWS headless). MCP `portfolio_ibkr` → Postgres (sustituye/complementa declaración manual). Fase: **F4-F5** (P1a), solo lectura, cuenta del grupo con consentimiento explícito. |
| **Ejecución de órdenes (plan)** | **P8** `trading_bot/`: mismo stack IBKR o **MetaTrader** según cuenta. **Rojo (HITL)**. Empezamos **paper trading** / cuenta demo. Nunca L4 por defecto. |
| **Restricciones UE** | No proponer ETFs US (PRIIPs); ver `acceso-mercados-ibkr.md`. El conector no corrige eso: las reglas siguen en `risk_gate` y REGLA #19. |
| **Secrets** | `IBKR_CP_API_*` o credenciales Gateway en `secrets.env`; nunca en Git. |

#### MetaTrader (MT4/MT5)

| Aspecto | Detalle |
|---|---|
| **Hoy** | Nada en repo. |
| **Plan** | **T1/T2**: API MT5 Python, puente socket/ZeroMQ a EA, o librería oficial. MCP `metatrader` en P8. Paper/demo primero. Complemento o alternativa a IBKR según dónde opere cada miembro. |

#### BYD (coche)

| Aspecto | Detalle |
|---|---|
| **Hoy** | Nada en repo. |
| **Plan** | **T5** preferido: Home Assistant + integración BYD/OVMS (OBD/módem). **T1** si BYD expone API estable en nuestra región. MCP `byd` en `domains/car/` (P7). Solo lectura + preclimatización/carga con confirmación (ámbar). **Nunca** conducción. |
| **Bloqueo** | Si no hay API ni HA estable → P7 queda en T7 (consultas manuales) hasta desbloquear. |

#### Vault documental (P9)

| Aspecto | Detalle |
|---|---|
| **Hoy** | Nada en repo. Diseño en §14.10. |
| **Plan** | **T1 + T2**: backend self-host con API (Paperless-ngx, MinIO+Postgres propio) + MCP `vault` en `domains/vault/`. Fase **F8**. |
| **Alternativa** | **T7**: reutilizar vault cloud/producto que ya uses (1Password, Bitwarden) con export/sync manual si no queremos self-host de blobs. |
| **Privacidad** | Máximo nivel: PDFs/imágenes **nunca** a LLM; solo metadatos en chat; `vault_gate`; cifrado en reposo; RLS schema `vault`. |
| **Secrets** | Clave maestra cifrado + credenciales API Paperless/MinIO en `secrets.env`. |

#### Cultivos / huerto (P10)

| Aspecto | Detalle |
|---|---|
| **Hoy** | Nada en repo. Diseño en §14.11. |
| **Plan** | **T1 + T2**: MCP `cultivos` en `domains/cultivos/`; datos en schema `cultivos` (Postgres); fotos en almacén local (MinIO o filesystem cifrado). Fase **F8**. |
| **Calendario** | Delega creación de eventos a **P2** (`domains/calendar/`, MCP `gcal`): riego, abono, siembra, cosecha con recurrencia. |
| **IoT (opcional)** | **P5** Home Assistant: humedad de suelo, pluviómetro, válvula de riego. Lectura verde; actuar riego **ámbar**. |
| **Clima** | **T1**: Open-Meteo (sin key) o AEMET si aplica; ajusta recomendaciones de riego. |
| **Visión (fotos)** | **T1 API** (GPT-4o-mini / Claude Haiku vision) con gate y opt-in, o **local Jetson** (Apéndice A) para análisis sin subir imagen. |
| **Privacidad** | Schema `cultivos` privado RLS; fotos no salen del host salvo análisis vision explícito; sin GPS en metadata si no hace falta. |

#### Emprendimiento (P11)

| Aspecto | Detalle |
|---|---|
| **Hoy** | Plan negocio v2 gastro española en `Mejoras/plan_negocio_v2_ES_TH.pdf` (17 pp., mar 2026). Agente sin implementar. |
| **Plan** | MCP `emprendimiento` en `domains/emprendimiento/`; ventures como filas en Postgres (`venture_id`: `gastro-es-th`, `youtube-th-77`). Fase **F9+**. |
| **P11a** | Seguimiento del plan 7 años (2026-2033): pilares embutidos/quesos/aceite/importación, hitos FDA, KPIs ventas B2B. |
| **P11b** | Canal YouTube: 77 provincias, video viaje+comida por provincia; integración **P4** (rutas) y **P2** (calendario rodajes). |
| **YouTube / redes** | T3 Apify o API YouTube (analytics, no upload automático); publicación **ámbar** (HITL). |
| **Privacidad** | Schema `emprendimiento` privado RLS; PDF de negocio en repo `Mejoras/` (no secrets). |

#### Kasikorn Bank (KBank, Tailandia)

| Aspecto | Detalle |
|---|---|
| **Hoy** | Sin referencias en el repo. |
| **Realidad** | Banca retail **no suele tener API abierta** para agentes personales. Open Banking Tailandia (PDPA) existe para terceros acreditados, pero el onboarding es pesado. |
| **Plan (exploratorio, F9+)** | (1) **T6**: sesión propia vía `cdp-browser` solo con orden explícita, solo lectura de saldo/movimientos, schema privado RLS. (2) **T7**: export CSV/OFX manual → ingest a Postgres. (3) Evaluar si KBank ofrece API partner/Open Banking aplicable a uso personal. **No automatizamos transferencias** (rojo). |
| **Privacidad** | Máxima sensibilidad: datos bancarios nunca a APIs de modelo; solo metadatos agregados si hace falta resumir. |

#### X / Twitter

| Aspecto | Detalle |
|---|---|
| **Hoy** | **T3 operativo**: Apify sin login del usuario. Lists (Stonks), handles (`@citrini`, `@zephyr_z9`, `@jukan05`), búsqueda opcional (`x_search_fetch.py`). Keys: `APIFY_KEYS`. |
| **Plan** | Mantener **T3** como vía principal (REGLA #11). API oficial de X: descartada por coste ($0.005+/lectura) salvo necesidad concreta. **T6** (login) solo para listas/DMs privados si Apify falla. MCP unificado `x_social` que envuelve los scripts actuales. |
| **Coste** | Atribuir en Langfuse; ~$0.01 por digest de lista 50 tweets. |

#### Otras plataformas (referencia rápida)

| Plataforma | Tier | Proyecto | Notas |
|---|---|---|---|
| **Google Calendar / Maps** | T1 + MCP Google | P2, P4 | OAuth usuario; scopes mínimos |
| **Google Tasks / Todoist** | T1 + MCP | P3 | |
| **Home Assistant** | T5 + MCP | P5, P7 | Self-host LAN; cámaras, sensores, posible BYD |
| **Aerolíneas** | T4 (+ T6 si login) | P4 | llm-scraper; check-in ámbar |
| **Reddit** | T3 Apify | P1 briefing | Actor retail; ya en research pipeline |
| **Finnhub / yfinance / SEC** | T1 | P1, ETL | Datos mercado; preferir siempre |
| **Telegram** | T1 Bot API | C1 | Entrada/salida grupo |
| **Hyperliquid** | T1 API (futuro) | opcional | Solo perps; doc en `acceso-mercados-ibkr.md` |

### Implementación en el monorepo

```
apps/agent/integrations/          # un subdir por plataforma (opcional)
├── ibkr/                         # Client Portal o ib_insync wrapper
├── x/                            # reexport Apify (migrar scripts actuales)
├── byd/                          # HA / API
├── banking/                      # kasikorn + futuros bancos (T6/T7)
└── metatrader/

infra/integrations.yaml           # tier, dominio, secrets key, allowlist, fase
packages/shared/integrations/     # tipos comunes (ConnectionStatus, etc.)
```

Cada fila de `integrations.yaml`: `{ id, tier, domains_allowed[], read|write, autonomy, secret_keys[] }`.

### Principios transversales

1. **Credenciales fuera de Git** (`secrets.env` en el EQR6); rotación manual documentada.
2. **Allowlist por agente**: finanzas no llama a `byd`; IoT no llama a `ibkr`.
3. **Leer ≠ operar**: lectura cartera IBKR (verde/ámbar) vs órdenes (rojo).
4. **Sin PII a LLM**: extractos bancarios, posiciones nominativas sensibles se agregan/anonymizan antes de API (§9).
5. **Fallback declarado**: si un conector falla, el agente dice **omitido** con motivo, no inventa (REGLA #6).
6. **Migración desde hoy**: posiciones manuales (T7) conviven con IBKR read (T1) hasta que confiemos en el sync; la web/dashboard sigue siendo HITL.

---

- **OTel → Langfuse self-hosted** (fase 2, retención corta en ClickHouse para no inflar el SSD).
- **Evals como gate en CI**: golden set con los fallos reales ya documentados (pre-market
  2026-05-15, release/call earnings, prompt injection, ticker mal identificado de REGLA #19).
- **Autonomía L0-L4 + semáforo + límites de coste**: con APIs de pago, `cost_budget_usd` y
  `max_tool_calls` son **críticos**. El motor de decisión se queda en **L2 (recomienda, no
  ejecuta)**; ejecución siempre humana.

### 8.1 Matriz de autonomía progresiva (empieza en "solo reporta")

| Nivel | Qué puede hacer el agente | Ejemplos en finanzas |
|---|---|---|
| **L0** | Solo observa y registra | ingesta ETL, snapshots, logging |
| **L1** | Reporta y resume (no propone acción) | briefing diario, ficha de valor |
| **L2** | **Recomienda** acción (humano decide) | lista de compra del radar, trade plan con SL/TP |
| **L3** | Actúa en lo **reversible** con confirmación | crear/editar borrador, abrir evento (fase 2) |
| **L4** | Actúa autónomo en ámbito acotado | nunca para mover dinero |

El dominio finanzas se queda en **L2** (recomienda, no ejecuta). Subir de nivel es una decisión
explícita por tipo de acción, no un default.

### 8.2 Semáforo de acciones (HITL)

- **Verde** (automático): leer datos, calcular, redactar, publicar briefing informativo.
- **Ámbar** (confirmar): publicar una recomendación de compra/venta al grupo, cambiar un trade plan.
- **Rojo** (HITL obligatorio): **cualquier cosa que mueva dinero o sea irreversible**. El grafo de
  LangGraph **interrumpe y persiste estado** en el `approval gate`; la acción solo sigue tras
  confirmación humana explícita. El agente **nunca** ejecuta una orden roja por su cuenta.

---

## 9. Privacidad con APIs públicas (el trade-off de "sin Ollama")

Sin modelo local, **todo prompt sale a una API externa**. Implicaciones y reglas:

- **Saneo obligatorio antes de cada llamada**: se anonimiza. Se mandan **tickers, tesis, números y
  posiciones anónimas**; **nunca** nombres reales, user_ids de Telegram ni "quién piensa qué".
- La **compactación de memoria** que la referencia hacía en local por privacidad aquí va por API:
  por eso solo se le pasa conocimiento de mercado anonimizado, no la bitácora personal.
- **Decisión consciente**: aceptamos que datos de mercado y posiciones **anónimas** pasen por la
  API. Si en el futuro no se quiere que ni eso salga del host, ese es el momento de **añadir
  Ollama** (el diseño lo permite sin cambios estructurales, §0.2).
- Se mantiene REGLA #1 (separación cross-user) y REGLA #7 (cero PII en publicaciones y web).

---

## 9bis. Capacidades del dominio finanzas (detalle)

Esto consolida lo que estaba disperso en el plan de mejoras, ya como parte del diseño.

### 9bis.1 Gestor de cartera (`portfolio`)

- Posiciones y cash sobre Postgres (`holdings`, `cash_balances` con `CASH-{CCY}`,
  `portfolio_operations`), no prosa en `bitacora/`.
- Calcula en vivo: **PnL** (abierto/realizado), **exposición por activo/sector**, **% de cartera**,
  **R abierto** por posición, **valor diario** (`portfolio_daily_values` para curva histórica).
- Es la entrada de **Step 0**: toda respuesta del cerebro arranca leyendo la cartera real.

### 9bis.2 Motor de riesgo + trade plans (`risk_engine`, `risk_gate`)

Pasa el riesgo de prosa a **reglas ejecutables**. Para cada idea, el motor produce un **trade plan**
que el `risk_gate` valida antes de publicar:

```json
{
  "ticker": "NVDA",
  "thesis_id": "knowledge_pages:nvda-2026q2",
  "conviction": 0.62,
  "position_pct_target": 4.0,
  "entries": [ {"px": 168.0, "weight": 0.5}, {"px": 158.0, "weight": 0.5} ],
  "stop_loss": 149.0,
  "take_profits": [ {"px": 198.0, "weight": 0.5}, {"px": 230.0, "weight": 0.5} ],
  "r_multiple_target": 2.8,
  "max_loss_pct_portfolio": 1.0,
  "risk_score": 41
}
```

Reglas que aplica `risk_gate` (defensa en código, no confianza en el LLM):

- **Sizing por riesgo**: `position_pct` acotado por `finai_risk_score` y por volatilidad; nada de
  posiciones que excedan el `max_loss_pct_portfolio` configurado.
- **Entradas y salidas escaladas** obligatorias (pesos suman 1.0); SL y al menos un TP presentes.
- **R coherente**: `r_multiple_target` calculado, no inventado; rechaza planes con R por debajo del
  umbral o con SL por encima de la entrada.
- **Límites de cartera**: tope de exposición por activo y por sector; tope de nº de posiciones
  abiertas; tope de riesgo agregado abierto.
- Si un plan no cumple, **no se publica**: vuelve al agente con el motivo (mismo patrón que
  `source_gate`).

### 9bis.3 Radar / screener semanal (`radar`)

- Criterios en `infra/radar-rules.yaml` (config, no código): combina **fundamentales** (de
  `sec_edgar_metrics`), **técnico** (de `yahoo_eod_bars`), **`finai_risk_score`** y **narrativa**
  (señales de X/Reddit/Citrini/Cárpatos).
- Corre **semanal (domingo)** sobre el universo (~500) y emite una **lista de compra rankeada** a
  Postgres.
- Aparece **a la vez** en Telegram (TL;DR) y en la web (página dedicada), sin duplicar lógica
  (Postgres + Realtime, §4bis).
- Cada candidato del radar lleva su **trade plan** preliminar (§9bis.2) para revisión humana (L2).

### 9bis.4 Grafo de decisión garantizado (LangGraph)

El nodo de decisión de inversión no es prosa libre: es un grafo con orden garantizado y un
`checkpointer` que persiste estado en el `approval gate`.

```
market_data ─> historical_context (wiki) ─> risk_sizing ─> tax_impact ─> synthesis ─> human_approval
```

- `market_data`: datos en vivo + fundamentales de Postgres.
- `historical_context`: recupera la página de conocimiento del ticker (LLM Wiki, §9bis.5).
- `risk_sizing`: invoca `risk_engine` y produce el trade plan.
- `tax_impact`: estima impacto fiscal de la operación (FIFO/holding period) para el aviso.
- `synthesis`: redacta la recomendación (modelo fuerte, §5ter).
- `human_approval`: **interrumpe** (rojo, §8.2) y espera confirmación; nada se ejecuta antes.

### 9bis.5 Memoria que compone (LLM Wiki) y compactación

- **Sustrato de conocimiento** en `knowledge_pages`: una **síntesis viva** por ticker/tema/tesis
  (confianza, drivers, enlaces, preguntas abiertas), que **se actualiza** en vez de reconstruirse.
  Las Threads/Temas/Tesis del finfreedom actual son la **semilla**; aquí pasan a tablas (§3).
- **Memoria episódica** (`agent_events`, `market_events`) + **semántica** (embeddings/RAG opcional
  en Qdrant, F6).
- **Compactación nocturna**: resume y consolida la memoria (vía API con saneo de PII, §9; o local en
  Jetson el día que exista). Evita que el contexto crezca sin control y mantiene las páginas al día.

---

## 10. Plan de construcción por fases

| Fase | Objetivo | Entregable |
|---|---|---|
| **F0** | Infra base | Docker Compose en el EQR6: Postgres/Supabase self-host + cloudflared + esqueleto de repos |
| **F1** | Datos | Esquema unificado + ETL de FinAI corriendo en el host + universo (~500) poblado + backfill |
| **F2** | Web | Dashboard **web** (`apps/client/web/`): shell + **sección Finanzas** (FinAI): auth, cartera, ficha valor |
| **F3** | Cerebro base | Hermes + `infra/loops.yaml` + Telegram + research pipeline + Step 0 + `source_gate` |
| **F4** | Cartera + riesgo + móvil | `portfolio`, `risk_engine`, `risk_gate`, `trade_plans` + **app móvil v1** (Finanzas) |
| **F5** | Radar | screener semanal → lista de compra en web + Telegram |
| **F6** | Decisión + memoria | LangGraph (nodos riesgo+fiscal+HITL) + `knowledge_pages` (tesis/threads/temas en DB) + RAG opcional |
| **F7** | Observabilidad + evals + autonomía | OTel/Langfuse + golden set + matriz L0-L4 |
| **F8** | Agentes P2-P7, P9-P10 | Resto del catálogo personal + secciones **Vault** y **Cultivos** |
| **F9+** | Canales, trading y emprendimiento | **C3** chat personal, **P8** trading bot, **P11** emprendimiento (P11a gastro + P11b YouTube) |

Cada fase entrega valor sola. F0-F2 dan ya un portal web con datos reales; F4 añade la app móvil;
F3-F5 el cerebro y el valor operativo; F6-F7 cierra P1; F8 añade P2-P7, P9 y P10 en web y móvil; F9+ C3,
P8 y P11 (§Catálogo).

---

## 11. Decisiones (estado 2026-06-04)

| # | Decisión | Estado |
|---|---|---|
| 1 | **Runtime/cerebro**: **Hermes + APIs de modelo** (pago por token), no Claude Code por suscripción. Claude Code/Codex solo para construir | **DECIDIDO** (Apéndice B, §5bis) |
| 2 | **Inferencia**: **APIs públicas, sin Ollama** por ahora; hueco para Jetson futuro | **DECIDIDO** (§0.2, Apéndice A) |
| 3 | **Hardware**: **Beelink EQR6** (descartado el plan antiguo del Intel N150) | **DECIDIDO** (Apéndice A) |
| 4 | **Auth/acceso**: login por miembro con **Supabase self-hosted** | **DECIDIDO** (§4) |
| 5 | **Base de datos**: **Supabase self-hosted** (Postgres + GoTrue + PostgREST + Realtime); nada de Supabase cloud/Vercel | **DECIDIDO** (§4) |
| 6 | **Lenguaje del ETL**: **TS para mercado**, Python para escrituras del agente, Postgres+Realtime de pegamento | **DECIDIDO** (§4bis) |
| 7 | **Repos**: **monorepo** | **DECIDIDO** (§12) |
| 8 | **Arquitectura multi-agente**: catálogo P1-P11 con mismo patrón; P1 primero en construcción | **DECIDIDO** (§Catálogo, §14) |
| 9 | **Identidad del proyecto**: nombre y dominio del cliente web (hoy `finfreedom.pages.dev`; con web autoalojada tras tunnel, ¿mismo dominio u otro?) + bundle id app móvil | **abierto** |
| 10 | **Backend vault (P9)**: Paperless-ngx vs MinIO+Postgres propio vs reutilizar producto existente | **abierto** (§14.10) |
| 11 | **Visión cultivos (P10)**: API vision con opt-in vs análisis local en Jetson | **abierto** (§14.11) |
| 12 | **Plan YouTube P11b**: nombre canal, cadencia y plantilla de video (doc markdown en `Mejoras/`) | **abierto** (§14.12.2) |

Pendiente menor: confirmar nombre/dominio (#9), backend vault (#10), visión cultivos (#11) y plan YouTube (#12) antes de F8-F9.

---

## 12. Estructura del monorepo (DECIDIDO)

Un solo repo con apps que comparten el contrato de datos (Postgres) y la infra (ver **§Catálogo**
para el mapa completo):

```
sistema/                          (nombre por decidir, §11 #9)
├── AGENTS.md                     # reglas duras heredadas de financial-freedom (fuente canónica)
├── README.md
├── docker-compose.yml            # orquesta todos los servicios del EQR6 (§2)
├── .env.example                  # plantilla de secrets (keys fuera de Git)
│
├── apps/
│   ├── client/                   # C2: dashboard web + app móvil
│   │   ├── web/                  #   Next.js: UI web (F2, Docker EQR6)
│   │   ├── mobile/               #   Expo: UI móvil + tab Chat C3 (F4+, F9+ chat)
│   │   ├── shared/               #   tipos, Supabase, hooks, formatters (sin UI)
│   │   └── sections/             #   finance, calendar, tasks, travel, iot, reports, car, vault, cultivos, emprendimiento
│   ├── agent/                    # P0 + dominios P1-P11
│   │   ├── core/                 #   Hermes, API de chat, router, gates, gateway Telegram
│   │   ├── domains/              #   finance, calendar, tasks, travel, iot, car, reports, vault, cultivos, emprendimiento, trading_bot
│   │   ├── tools/                #   valuation, technical, finnhub, x_lists, reddit, carpatos...
│   │   ├── gates/                #   source_gate, risk_gate, telegram_md_lint
│   │   └── data/                 #   capa de acceso a Postgres (psycopg/asyncpg)
│   └── etl/                      # ETL TS de FinAI (SEC/Yahoo/risk) + backfill por HTTP
│
├── packages/
│   ├── db/                       # esquema SQL + migraciones (única fuente del modelo de datos)
│   ├── scraper/                  # llm-scraper wrapper, schemas Zod, scripts generados (§7bis)
│   └── shared/                   # tipos/contratos compartidos (tickers, enums) si aplica
│
├── infra/
│   ├── supabase/                 # config self-host (gotrue, postgrest, realtime, studio)
│   ├── loops.yaml                # catálogo de loops runtime (§5quater)
│   ├── models.yaml               # router de modelos (§5ter)
│   ├── n8n/                      # workflows de cron/alertas
│   └── cloudflared/              # config del tunnel
│
└── evals/                        # golden set de evals como gate (§8)
```

Ventaja del monorepo aquí: el **esquema en `packages/db`** es el contrato único que ven la web
(TS), el agente (Python) y el ETL (TS). Un cambio de esquema se versiona en un sitio.

---

## 13. Riesgos y qué NO hacer

- **No reintroducir cloud para datos privados.** Supabase va **self-hosted**; nada de cartera o
  bitácora a Supabase cloud ni a Vercel.
- **No mandar PII a las APIs** (§9). Es la regla que sustituye a "todo local" mientras no haya Ollama.
- **No sobre-ingenierizar.** Cada pieza con su gate y su eval, como la cultura de financial-freedom.
  Empezar por F0-F2 (dashboard + sección Finanzas + datos) que ya es útil, no por la capa agéntica
  completa.
- **Vigilar el SSD de 500 GB**: `sec_edgar_metrics` y las trazas de ClickHouse son los que crecen;
  whitelist de conceptos + corte `SEC_METRICS_MIN_PERIOD_END` + retención de trazas. Plan de
  segundo SSD/M.2 si se llena.
- **Backups**: con DB local, la cartera y la memoria son críticas; dump cifrado diario fuera del host.

---

## 14. Detalle de los dominios de agentes (P1-P11)

> **Catálogo completo**: ver **§Catálogo** (tabla P0-P11, objetivos por proyecto, C1-C3). Todos los
> agentes comparten el mismo patrón; finanzas (P1) no tiene tratamiento especial en la arquitectura.

Los proyectos P1-P11 son **dominios iguales** bajo Hermes (P0): cada uno aporta constitución, tools
MCP, schema (si aplica) y sección del dashboard. **P1 se construye primero** (F3-F7); P2-P7, P9 y P10 en F8;
P8 y P11 en F9+.

Resumen de objetivos: **§Catálogo** (*Objetivos por proyecto*). Detalle extendido: **P1** en
§9bis; **P2-P7, P9, P10 y P11** en las subsecciones siguientes; **P8** en §14.5.

Todos comparten core, infra, router de modelos y guardrails. Mover dinero (P8) sigue siendo **rojo**
(HITL); el resto según ámbar/verde de cada dominio.

### 14.1 Cómo encaja

- **Hermes clasifica la intención** y enruta al agente del dominio: "¿esto es finanzas, calendario,
  vault, cultivos, emprendimiento o tareas?". Añadir un dominio = añadir un **agente especializado** + sus **tools MCP**, no tocar el
  núcleo.
- **Integraciones por MCP**: un **MCP de Google Calendar** (eventos), un **MCP de tareas/todos**, etc.
  El agente solo gana herramientas nuevas; hay servidores MCP ya hechos para Google.
- **Infra compartida y reutilizada**: el gateway de Telegram (mismo canal o DM aparte), Postgres
  (un **schema por dominio**), tu auth, el **router de modelos** (§5ter), la observabilidad, los
  guardrails y el scheduler (n8n). Los agentes personales **no rehacen** nada de esto.
- **A2A** para agentes que vivan en otro proceso/framework: publican su Agent Card y Hermes les
  delega como pares.

### 14.2 Estructura en el monorepo

```
apps/
├── agent/
│   ├── core/              # orquestador, router de modelos, gates, gateway Telegram (compartido)
│   └── domains/
│       ├── finance/       # P1: finanzas (reglas duras, tools de mercado)
│       ├── calendar/      # P2: Google Calendar                         [F8]
│       ├── tasks/         # P3: tareas/todos                             [F8]
│       ├── travel/        # P4: viajes/movilidad (§14.7)               [F8]
│       ├── iot/           # P5: control del hogar (§14.8)              [F8]
│       ├── reports/       # P6: reporte de 90 días                       [F8]
│       ├── car/           # P7: integración BYD (§14.9)                [F8]
│       ├── vault/         # P9: vault documental (§14.10)              [F8]
│       ├── cultivos/      # P10: huerto / cultivos (§14.11)           [F8]
│       └── emprendimiento/ # P11: emprendimiento (§14.12)             [F9+]
```

El **core es agnóstico de dominio**; cada proyecto P1-P11 aporta su constitución, tools y autonomía.
Construir el orquestador + patrón MCP desde F3 con **P1 como primer `domains/`**, no un monolito
hardcodeado a finanzas: P2-P11 se enchufan igual.

### 14.3 Separación y privacidad (crítico)

- **Multi-dominio, distinto dueño de datos**: el dominio finanzas sirve al **grupo**; los dominios
  personales (calendario, tareas, **vault**) son **tuyos** y privados. Van en **schemas separados** con acceso
  estricto (RLS por tu usuario); el grupo **nunca** ve tu calendario, tus documentos ni tus tareas.
- **Allowlist de herramientas por agente** (constraints de la referencia §3.2): el agente de
  finanzas no puede tocar el calendario y viceversa. Limita el blast radius.
- **Autonomía por dominio** (§8): crear un evento de calendario o cerrar una tarea puede ser
  **ámbar** (confirmar) o automático según el caso; mover dinero sigue siendo **rojo** (HITL).
- **Coste por dominio**: el presupuesto (§5ter.2) se puede separar por dominio para no mezclar
  gasto del grupo con el personal.

### 14.4 Qué hacer ahora para no cerrarte puertas

1. Construir `apps/agent/core` **agnóstico de dominio** desde F3 (orquestador + router + gateway +
   gates). **P1 (`domains/finance/`) es el primer dominio**, mismo patrón que P2-P11.
2. Exponer las tools como **MCP con contrato idempotente** (ya previsto en §5 y §9 del análisis).
3. Postgres con **schema por dominio** desde el diseño de datos (`packages/db`).
4. Dejar el **gateway de Telegram multi-intención** (un mensaje puede ir a finanzas o a tu agenda).

### 14.5 Ideas exploratorias (P8 y posteriores)

El patrón (orquestador + `domains/` + MCP) habilita también dominios más
ambiciosos. Se anotan como ideas a validar, con su nivel de autonomía y su principal riesgo:

| Idea | Qué haría | Tools / integración | Autonomía | Riesgo / nota |
|---|---|---|---|---|
| **Bot de trading automático** | ejecutar órdenes según señales del cerebro de finanzas | MCP de bróker/plataforma con API: **MetaTrader (MT4/MT5)**, IBKR, Alpaca, en cuenta acotada | **rojo (HITL) por defecto**; L4 solo en sandbox/paper o con límites duros | **mueve dinero**: es la línea roja del diseño (§8.2). Empezar en **paper trading** (cuenta demo de MetaTrader), límites de `max_loss`, sin auto-ejecución real hasta evals sólidas |

(Los agentes de **viajes/movilidad** (P4), **control IoT** (P5), **integración BYD** (P7), **vault
documental** (P9), **cultivos** (P10) y **emprendimiento** (P11) están en F8/F9+, detallados en
§14.7-§14.12. P4 **consume** P7 (carga), P9 (documentos) y alimenta **P11b** (rutas provincias).)

Notas de diseño que ya las soportan sin rediseño:

- El **bot de trading** es el caso límite: conecta el dominio finanzas (que **recomienda**, L2) con
  ejecución real. El diseño lo permite, pero **mover dinero sigue siendo rojo** (§8.2): se construye
  primero en **paper trading** con observabilidad y evals, y solo se sube de autonomía por decisión
  explícita y con límites duros (`cost`/`max_loss`/horario), nunca por defecto. Conector previsto:
  **MetaTrader** (vía su API/puente, p. ej. socket/ZeroMQ a un EA, o la API de MT5 para Python),
  empezando por **cuenta demo**.
- Todo dominio reutiliza **core, router de modelos, guardrails, scheduler y observabilidad** y vive
  en su `domains/` con **schema propio** y **allowlist de tools** (§14.3); añadir uno es añadir un
  `domains/` + su MCP, no rehacer la plataforma.

```
apps/agent/domains/
├── ...                # finance, calendar, tasks, travel, iot, car, reports, vault, cultivos (F8)
├── emprendimiento/    # P11: gastro-es-th, youtube-th-77 [F9+]
└── trading_bot/       # P8: MetaTrader/IBKR (paper -> real) [F9+; rojo por defecto]
```

> Resumen: sí, escala. Ver **§Catálogo** para la lista completa. Cada fila es un `domains/` + MCP
> que reusa core, infra, modelos y guardrails.

### 14.6 Chat personal (C3): módulo en la app móvil

**Proyecto C3 (F9+).** **Chat con los agentes** integrado en **`apps/client/mobile/`** (tab Chat)
para tu uso personal: texto, y en el futuro **voz**, como canal principal **en lugar de Telegram**
para calendario, tareas, viajes, IoT, BYD, etc. Telegram **se mantiene para el grupo de finanzas**
(C1); el chat personal es **solo tuyo** y vive en la misma app móvil que el dashboard (C2).

**Objetivo:** hablar con Hermes y cualquier dominio personal desde el móvil (y el head unit del BYD)
sin depender de Telegram ni mezclar conversaciones del grupo con las tuyas. No es una app aparte:
reutiliza auth, API y navegación de `apps/client/mobile/`.

Encaja porque **el canal está desacoplado del cerebro** (§6): Telegram, web, móvil y este chat
consumen la **misma API de chat** del core (`apps/agent/core/`). Cambiar de Telegram al tab Chat
**no rediseña** ningún agente.

**Qué incluye el proyecto:**

| Entregable | Descripción |
|---|---|
| **API de chat** (core) | HTTP/WebSocket: enviar mensaje, recibir respuesta, historial, routing a dominio |
| **`apps/client/mobile/` (tab Chat)** | UI nativa Expo; comparte `shared/` con el resto del cliente |
| **Auth** | Login Supabase (mismo usuario que web y móvil, RLS personal) |
| **Voz (fase posterior)** | STT/TTS en móvil o local (Whisper/Jetson); transductor delante del mismo cerebro |
| **BYD head unit** | Misma app móvil en el coche, manos libres (depende del fabricante) |

**Ruta pragmática:** F4 entrega app móvil con secciones de datos (Finanzas); F9+ activa tab Chat
completo (texto → voz). Telegram del grupo **no se elimina**; conviven C1 (grupo) y C3 (tú).

```
                 ┌─ C1 Telegram (grupo: finanzas)
 Cerebro (API ───┼─ C2 Web (`apps/client/web/`: shell + secciones)
 de chat) ───────┼─ C2 Móvil (`apps/client/mobile/`: secciones + tab Chat C3)  [F4 / F9+]
                 └─ C3 en BYD head unit (misma app móvil, manos libres)         [F9+, según fabricante]
```

### 14.7 Agente de viajes / movilidad (`domains/travel`)

Agente **P4 (F8)** que cubre dos capacidades complementarias: gestiones de viaje y
planificación de rutas en coche. Es de los casos más maduros del mercado (muchos asistentes ya lo
hacen), así que el riesgo es de integración, no de viabilidad.

**Qué hace:**

1. **Check-in de vuelos**: detecta la ventana de check-in, avisa y, si se puede, lo prepara o lo
   hace; recuerda equipaje, asiento y tarjeta de embarque. Lee tus vuelos del calendario o del
   correo (con tu permiso) y los cruza con la aerolínea.
2. **Road trips con el BYD**: a partir de origen, destino y fechas, **diseña el viaje completo**:
   - **Ruta** y tramos con tiempos realistas (**Google Maps Platform**: Directions, Places,
     Geocoding).
   - **Landmarks y paradas de interés** en ruta (Places: miradores, monumentos, gastronomía).
   - **Pernoctas**: sugerencias de dónde dormir por etapa (Places/alojamiento), ajustadas a tu
     ritmo y presupuesto.
   - **Puntos de carga del coche**: planifica la **carga** según autonomía y **estado real del BYD**
     (vía dominio **P7 / `domains/car`**, §14.9), con paradas en cargadores compatibles (APIs de
     red de carga, p. ej. Open Charge Map u Google EV; potencia y conector).
   - **Itinerario final** consolidado (día a día) que escribe a Postgres y puede volcar a tu
     calendario (§calendar) y mostrarse en la web/app.

**Tools / integraciones (MCP):** Google Maps Platform (Directions/Places/Geocoding), fuente de
**puntos de carga** (Open Charge Map o equivalente), dominio **`car/` (P7, §14.9)** para SoC y
autonomía, dominio **`vault/` (P9, §14.10)** para caducidad de pasaporte/visados/seguro de viaje,
aerolíneas/correo para vuelos, y `calendar` para volcar el plan. Datos de viaje, coche y documentos
son **tuyos** (schema privado, §14.3).

**Autonomía:** **verde** para proponer rutas, planes y recordatorios; **ámbar** (confirmar) para
hacer un check-in real, reservar o lanzar la preclimatización/carga del coche. **Nada de conducción
ni control de marcha**: el agente planifica e informa, no opera el vehículo.

### 14.8 Agente de control IoT del hogar (`domains/iot`)

Agente **P5 (F8)** para tu casa: **cámaras, termómetros y sensores WiFi, luces, enchufes,
clima**, y rutinas.

**Patrón recomendado: una sola capa de dispositivos.** En vez de integrar cada cacharro por su API,
el agente habla con **Home Assistant** (self-host en el EQR6 o en un equipo aparte de la LAN) a
través de **un único MCP**. Home Assistant ya soporta la mayoría de marcas (Matter, Zigbee, Wifi,
ONVIF para cámaras, etc.), así que añadir un dispositivo nuevo es configurarlo en Home Assistant,
no tocar el agente.

**Qué hace:**

- **Leer estado** (verde): temperatura/humedad de los sensores, estado de luces/enchufes,
  consumo, eventos de cámaras (movimiento), online/offline.
- **Actuar** (ámbar, confirmar): encender/apagar, ajustar termostato, activar escenas, rutinas
  ("modo noche").
- **Avisos proactivos**: "el termómetro del salón marca X", "cámara detecta movimiento", "sensor
  sin conexión", por el canal que elijas (Telegram DM o la app propia §14.6).

**Privacidad (crítico).** Es de los dominios más sensibles: **cámaras y presencia en casa**. Por eso:

- Vive en **schema privado** con RLS por tu usuario; el **grupo nunca** ve nada del hogar.
- **El vídeo no sale del host ni va a APIs de modelo.** El agente trabaja con **eventos y
  metadatos** (Home Assistant: "movimiento a las 18:03"), no con el stream. Si algún día se quiere
  análisis de imagen, se hace **local** (la Jetson del Apéndice A es justo para eso), nunca con una
  API pública (REGLA #7).
- **Allowlist de dispositivos/acciones**: define qué puede tocar el agente; lo crítico
  (cerraduras, alarmas) puede quedar fuera de su alcance o forzar confirmación.

**Tools / integración (MCP):** Home Assistant como capa única (cubre Matter/HomeKit/Google Home,
Zigbee/Z-Wave, cámaras ONVIF/RTSP, sensores WiFi). Todo dentro de la LAN.

### 14.9 Integración BYD (`domains/car`, P7)

**Proyecto P7 (F8).** Conector dedicado al **BYD**: leer estado del vehículo y, con confirmación,
actuar sobre funciones no críticas (preclimatización, inicio de carga). Es un **dominio propio**
(`domains/car/`) del que se alimentan el agente de **viajes** (P4, road trips con puntos de carga)
y la **app chat** (C3, consultas manos libres en el coche).

**Qué hace:**

| Capacidad | Autonomía | Notas |
|---|---|---|
| Estado de batería (SoC), autonomía estimada, ubicación | verde | input clave para road trips (P4) |
| Estado de carga (conectado, kW, tiempo restante) | verde | |
| Preclimatización / climatización remota | ámbar (confirmar) | |
| Iniciar/parar carga (si la API lo permite) | ámbar (confirmar) | |
| **Conducción, marcha, dirección** | **prohibido** | el agente **nunca** opera el vehículo en movimiento |

**Tools / integración (MCP):** ver §7ter (BYD). Resumen: API BYD si existe; si no, Home Assistant +
integración BYD/OVMS. Si nada estable → T7 manual hasta desbloquear.

**Privacidad:** ubicación y hábitos de movimiento son **datos personales sensibles**. Schema privado
(RLS solo tu usuario), **nunca** al grupo ni a APIs de modelo. El grupo de finanzas **no ve** nada
del coche.

**Relación con otros proyectos:**

- **P4 (travel)** llama a P7 para SoC/autonomía al planificar cargas en road trips.
- **C3 (chat personal)** es el tab Chat de **`apps/client/mobile/`**; puede usarse en el **head unit
  BYD** (manos libres) para preguntar "¿cuánta batería me queda?" o "preclimatiza a las 18:00".

### 14.10 Vault documental (`domains/vault`, P9)

**Proyecto P9 (F8).** **Caja fuerte personal** para guardar y gestionar documentos importantes:
pasaporte, permiso de trabajo, seguro médico, DNI/NIE, contratos, pólizas, certificados, recibos
fiscales relevantes, etc. El agente **organiza, recuerda caducidades y responde preguntas**; no
sustituye un gestor documental profesional de empresa, pero centraliza **tu** vida administrativa.

**Backend de almacenamiento (decisión abierta).** Podemos **reutilizar un producto que ya tengamos**
o montar uno self-hosted en el EQR6. Candidatos a evaluar en F8:

| Opción | Qué es | Encaje | Notas |
|---|---|---|---|
| **A. Paperless-ngx** | DMS self-host (OCR, tags, búsqueda full-text) | Alto para PDFs escaneados | Contenedor Docker; API REST; OCR local |
| **B. Vaultwarden** | Bitwarden-compatible self-host | Medio (adjuntos + notas seguras) | Mejor para credenciales; adjuntos limitados |
| **C. MinIO + Postgres propio** | Blobs cifrados + metadatos en `schema vault` | Máximo control | Más trabajo; encaja con monorepo |
| **D. Producto externo ya en uso** | 1Password, Bitwarden cloud, iCloud, etc. | Solo si aceptamos T7 sync manual o API limitada | Menos self-host; evaluar caso a caso |

**Decisión pendiente (#10 en §11):** elegir A/B/C (recomendación inicial: **Paperless-ngx** si el
volumen es PDFs escaneados; **C** si queremos cifrado y modelo de datos 100% nuestro). El agente
(P9) habla con el backend vía **MCP `vault`**, sea cual sea.

**Qué hace el agente:**

| Capacidad | Autonomía | Notas |
|---|---|---|
| Subir documento (foto/PDF desde móvil o web) | ámbar (confirmar categoría) | OCR/indexación en el host |
| Clasificar y etiquetar (tipo, titular, país, emisor) | verde/ámbar | taxonomía: `identity`, `immigration`, `health`, `insurance`, `contract`, `tax`, `other` |
| Extraer y guardar **metadatos** (número doc, fecha emisión, **fecha caducidad**) | verde | campos estructurados en Postgres; el binario no sale del host |
| Recordatorios proactivos ("el permiso caduca en 30 días") | verde | n8n + notificación C3/Telegram DM |
| Responder en chat ("¿cuándo caduca mi pasaporte?") | verde | el LLM ve **solo metadatos** acordados, no el PDF |
| Compartir enlace temporal a un documento | ámbar | solo tú; TTL corto; audit log |
| Borrar o archivar documento | ámbar | soft-delete + retención configurable |

**Privacidad (máximo nivel, igual o por encima de IoT/BYD):**

- Schema **`vault`** privado, RLS estricta (solo tu usuario). El **grupo de finanzas nunca** ve el vault.
- **Los ficheros (PDF/imagen) no salen del EQR6** y **no van a APIs de modelo**. Hermes responde con
  metadatos indexados (`expiry_date`, `doc_type`, `title`); si hace falta OCR, corre **en el host**
  (Paperless o Tesseract local), no en la nube.
- **Cifrado en reposo**: blobs en disco cifrados (LUKS del SSD + cifrado a nivel aplicación o
  bucket MinIO SSE); clave maestra en `secrets.env`, rotación manual.
- **Gate `vault_gate`**: bloquea cualquier tool o prompt que intente incluir contenido binario o texto
  OCR completo en la llamada al LLM; solo metadatos allowlisted.
- **Backups**: copia cifrada off-site del vault; sin backup el riesgo es total (§12).

**Tools / integración (MCP):** `vault_list`, `vault_metadata`, `vault_expiring`, `vault_upload`
(ámbar), `vault_search_tags` sobre el backend elegido (Paperless API, MinIO+Postgres, etc.).

**Relación con otros proyectos:**

- **P4 (travel)** consulta P9 antes de road trips o vuelos internacionales (pasaporte/visado/seguro
  de viaje vigentes).
- **C3 (chat)** canal natural para "¿dónde tengo el PDF del seguro médico?" (devuelve enlace en app,
  no pega el documento en el chat del LLM).
- **Sección dashboard** `apps/client/sections/vault/`: listado, caducidades, subida, visor PDF en
  web/móvil (descarga autenticada vía tunnel, sin URL pública).

**Modelo de datos (mínimo en `packages/db`, schema `vault`):**

- `vault_documents` (id, title, doc_type, issuer, issued_at, expires_at, tags[], storage_key, checksum)
- `vault_reminders` (document_id, remind_at, channel, sent_at)
- `vault_audit_log` (who, action, document_id, ts) append-only

### 14.11 Agente de cultivos / huerto (`domains/cultivos`, P10)

**Proyecto P10 (F8).** Gestión del **huerto, macetas e invernadero**: qué tienes plantado, cuándo
**regar**, **abonar**, **sembrar/trasplantar** y cosechar; **timeline de fotos** para ver evolución;
**recomendaciones** según estación, clima e historial. Pensado para uso personal (no explotación
agrícola comercial), pero escalable a varios bancales o zonas.

**Qué hace:**

| Capacidad | Autonomía | Notas |
|---|---|---|
| Registrar cultivos (especie, variedad, ubicación, fecha siembra) | verde | maceta, bancal, invernadero |
| Planificar calendario de **riego** y **abono** (recurrencia + ajuste por clima) | verde | eventos vía **P2** (`gcal`) |
| Recordar **ventanas de siembra/trasplante** (calendario lunar opcional, zona climática) | verde | fuentes agronómicas + reglas propias |
| Subir **foto** desde móvil/web y analizar evolución (plagas, amarilleo, crecimiento) | verde/ámbar | visión § abajo |
| Comparar fotos en el tiempo (timeline por cultivo) | verde | almacén local; resumen en Postgres |
| Recomendar acciones ("falta nitrógeno", "riega mañana por calor") | verde | LLM + metadatos + clima; no diagnóstico fitosanitario legal |
| Leer **humedad suelo** / pluviómetro vía **P5 IoT** | verde | ajusta plan de riego |
| Activar **válvula de riego** vía P5 | **ámbar** (confirmar) | nunca riego nocturno automático sin regla explícita |
| Marcar tarea hecha (regó, abonó, cosechó) | verde | actualiza calendario y próximo hito |

**Integración con Google Calendar (P2):**

P10 **no duplica** el calendario: genera **eventos recurrentes y avisos** llamando al MCP de
**P2** (`calendar_create`, `calendar_update`). Ejemplos: "Riego tomates maceta 3", "Abono cítricos",
"Siembra lechuga otoño". El usuario ve todo en Google Calendar y en la sección **Cultivos** del
dashboard (vista agrícola con próximos hitos).

**Análisis de fotos (evolución del cultivo):**

1. **Subida**: desde app móvil (cámara) o web; blob en almacén local (mismo patrón que vault/P9,
   schema `cultivos`, sin URL pública).
2. **Análisis** (decisión #11, §11):
   - **Opción A (inicial):** API vision (Haiku / GPT-4o-mini) con **opt-in por foto** y gate
     `cultivos_vision_gate`: solo la imagen acordada sale del host; el LLM devuelve observación
     estructurada (estado hojas, posible plaga, comparación vs foto anterior).
   - **Opción B (futuro):** modelo local en **Jetson** (Apéndice A) para no subir imágenes.
3. **Timeline**: cada foto enlazada a `cultivo_id`; la UI muestra evolución; el agente resume
   tendencia ("crecimiento normal", "empeora desde hace 2 semanas").

**Tools / integraciones (MCP):**

| Tool | Función |
|---|---|
| `cultivos_list` / `cultivos_get` | inventario y ficha de cada cultivo |
| `cultivos_schedule` | calcular próximo riego/abono/siembra |
| `cultivos_log_care` | registrar acción realizada |
| `cultivos_photo_upload` | subir foto + disparar análisis (ámbar si vision API) |
| `cultivos_photo_compare` | diff semántico entre dos fechas |
| `cultivos_weather` | Open-Meteo / AEMET para ajuste de riego |
| `calendar_*` (vía P2) | crear/actualizar eventos Google Calendar |
| `iot_*` (vía P5, opcional) | humedad suelo, válvula riego |

**Privacidad:**

- Schema **`cultivos`** privado, RLS solo tu usuario. El grupo de finanzas **no** ve el huerto.
- Fotos **permanecen en el EQR6**; análisis vision por API solo con confirmación explícita (menos
  restrictivo que P9 vault, pero sin metadata GPS innecesaria en el prompt).
- Recomendaciones agronómicas = **orientativas**, no sustituto de agrónomo/técnico fitosanitario.

**Relación con otros proyectos:**

- **P2 (calendar):** canal de recordatorios en Google Calendar.
- **P5 (IoT):** sensores de humedad y actuadores de riego en invernadero/balcón.
- **P3 (tasks):** opcional; P10 puede crear tareas puntuales, pero el calendario es la fuente
  principal de hitos recurrentes.
- **P4 (travel):** modo "vacaciones": pausar riegos automáticos o escalar frecuencia antes de irte.
- **Sección dashboard** `apps/client/sections/cultivos/`: mapa de cultivos, calendario de cuidados,
  timeline fotos, alertas.

**Modelo de datos (mínimo en `packages/db`, schema `cultivos`):**

- `cultivos` (id, name, species, variety, location, planted_at, expected_harvest_at, notes)
- `cultivos_care_plans` (cultivo_id, care_type: water|fertilize|plant|harvest, recurrence, next_due)
- `cultivos_care_log` (cultivo_id, care_type, done_at, notes, photo_id?)
- `cultivos_photos` (id, cultivo_id, taken_at, storage_key, vision_summary, health_tags[])
- `cultivos_weather_cache` (date, temp, rain_mm, source) para ajuste de riego

### 14.12 Agente de emprendimiento (`domains/emprendimiento`, P11)

**Proyecto P11 (F9+).** Dominio para **planes de negocio y proyectos propios**: seguimiento de hitos,
KPIs, tareas, calendario y recomendaciones del agente. Un mismo `domains/emprendimiento/` agrupa
**ventures** (sub-proyectos) identificados por `venture_id`; cada uno tiene documento fuente, metas
y dashboard propio en `apps/client/sections/emprendimiento/`.

**Qué hace el agente (transversal a ventures):**

| Capacidad | Autonomía | Notas |
|---|---|---|
| Cargar/sintetizar plan de negocio (PDF o markdown en `Mejoras/`) | verde | índice en Postgres; no mandar PDF entero al LLM |
| Desglosar hitos anuales/mensuales y recordar vencimientos | verde | eventos vía **P2** Calendar |
| Registrar KPIs (ventas, unidades, leads, suscriptores YouTube) | verde | gráficos en dashboard |
| Proponer siguientes acciones / checklist semanal | verde | |
| Publicar en redes o YouTube | **ámbar** | HITL; el agente prepara borrador, no publica solo |
| Gastos e ingresos del venture (opcional) | verde | schema privado; no mezclar con P1 finanzas del grupo |

---

#### 14.12.1 Venture P11a — Gastronomía española artesanal (Surat Thani, Tailandia)

**Documento fuente:** [`Mejoras/plan_negocio_v2_ES_TH.pdf`](plan_negocio_v2_ES_TH.pdf) (v2.0, mar 2026,
17 páginas, bilingüe ES/TH).

**Resumen del plan (para el agente):**

- **Horizonte:** 7 años (2026-2033), crecimiento orgánico desde inversión mínima.
- **Sede:** Surat Thani + envíos nacionales; hub hacia Koh Samui, Phangan y Tao.
- **Propietaria tailandesa:** ventaja legal (sole proprietorship DBD, licencias FDA).
- **Cuatro pilares secuenciales:**
  1. **Embutidos artesanales** (Año 1): chorizo, salchichón, lomo, sobrasada, fuet.
  2. **Quesos artesanales** (Año 2): manchego, curados, torta del casar, idiazábal.
  3. **Aceite premium + salsas** (Años 3-4): infusiones (pimentón, hierbas, trufa); salsas con pimiento propio.
  4. **Importación premium** (Años 6-7): jamón ibérico, vino español mercado lujo.
- **Canales:** redes sociales → B2B restaurantes → catering eventos → importación.
- **Riesgos clave:** cadena de frío, licencias lácteos FDA, aranceles vino, consistencia calidad escalada.

**Qué debe hacer el agente P11a:**

- Mantener **checklist regulatorio** (SorBor 1/1, Orr. 2, HACCP, etiquetado bilingüe) por pilar.
- Alertar hitos del plan (p. ej. "Año 2: arrancar línea quesos", "registro FDA aceite").
- Proponer acciones comerciales semanales (outreach B2B Koh Samui, contenido RRSS).
- Cruzar con **P4** si hay desplazamientos de entrega; con **P9** para licencias y permisos escaneados.

**Modelo de datos (venture `gastro-es-th`, schema `emprendimiento`):**

- `ventures` (id, slug, title, doc_path, horizon_start, horizon_end)
- `venture_milestones` (venture_id, year, pillar, title, due_date, status)
- `venture_kpis` (venture_id, date, metric, value, unit) — ventas THB, kg producidos, clientes B2B
- `venture_tasks` (venture_id, title, due, done_at) — opcional sync con P3

---

#### 14.12.2 Venture P11b — Canal YouTube: 77 provincias de Tailandia (viaje + comida local)

**Concepto.** Proyecto de **emprendimiento de contenido**: visitar las **77 provincias** de Tailandia
y publicar un **video de viajes + gastronomía** por provincia, documentando **platos típicos y
comida local** de cada una. Serie cerrada (77 episodios) con valor SEO, turismo y cultura culinaria.

**Documento fuente:** plan detallado **pendiente** en `Mejoras/` (decisión #12, §11); el diseño vive
aquí hasta redactarlo.

**Qué incluye cada episodio (plantilla):**

1. **Viaje** a la capital de provincia (o zona representativa): cómo llegar, 1-2 landmarks (sin copiar
   otros canales: ángulo propio).
2. **Comida local:** 3-5 platos emblemáticos; mercado nocturno, puesto calle, restaurante local;
   entrevista breve al vendedor/cocinero si consiente.
3. **Mapa / contexto:** dónde está la provincia, vecinos ya visitados, curiosidad cultural.
4. **Post-producción:** intro/outro de serie, subtítulos ES + EN (opcional TH), mini guía en descripción.

**Qué debe hacer el agente P11b:**

| Capacidad | Autonomía | Integración |
|---|---|---|
| Mapa de progreso (provincias visitadas / pendientes / en rodaje) | verde | dashboard + Postgres |
| Planificar ruta y fechas de rodaje por provincia | verde | **P4 travel** (Directions, pernoctas, BYD si aplica) |
| Bloques en **Google Calendar** (rodaje, edición, publicación) | ámbar | **P2 calendar** |
| Checklist pre-rodaje (permisos dron, equipo, backup SD) | verde | **P3 tasks** opcional |
| Borrador título, descripción, tags y capítulos YouTube | verde | no publicar solo |
| Registrar platos documentados por provincia (base culinaria) | verde | sinergia futura con **P11a** (ideas producto/local sourcing) |
| Métricas canal (views, subs, retención) | verde | YouTube Analytics API (T1), lectura periódica |

**Cadencia objetivo (a fijar en plan markdown):** p. ej. 1-2 provincias/mes → serie ~3-6 años.

**Privacidad y publicación:** contenido **público** en YouTube; metadatos de planificación (rutas,
contactos locales) en schema privado RLS. Publicar video = **ámbar** (revisión humana).

**Modelo de datos (venture `youtube-th-77`):**

- `th_provincias` (code, name_th, name_en, visited, filmed, published, youtube_url)
- `province_episodes` (province_code, shoot_date, publish_date, dishes[], notes, status)
- `youtube_metrics_snapshot` (date, subs, views_total, views_last_30d)

**Sinergias entre P11a y P11b:**

- El canal documenta **comida tailandesa por provincia**; el negocio P11a vende **gastronomía española**
  en el sur: audiencias distintas pero complementarias (marca personal, cross-promo opcional).
- Platos descubiertos en P11b pueden inspirar contenido RRSS de P11a ("tabla española vs curry del sur").

**Tools / integración (MCP):** `emprendimiento_venture_get`, `emprendimiento_milestone_list`,
`emprendimiento_kpi_record`, `emprendimiento_province_status`, `calendar_*` (P2), `travel_route` (P4),
YouTube Data API (solo lectura analytics).

**Sección dashboard** `apps/client/sections/emprendimiento/`: pestañas **Gastro ES** y **YouTube 77**,
mapa de Tailandia con provincias, timeline de hitos, KPIs.

---

## Apéndice A. Hardware: host actual y ruta futura para modelos locales

### A.1 Host elegido

**Beelink EQR6** (Ryzen 5 6600U, 6c/12t x86-64, 24 GB DDR5 ampliable, 500 GB SSD). Es el host
principal porque el sistema diseñado es **CPU + RAM + I/O** (Postgres/Supabase, Next.js en Docker,
app móvil como cliente externo, orquestación Python por API, ETL, n8n), no inferencia local. x86 = cero fricción para self-hostear
el stack; mejor RAM por euro que cualquier Jetson de RAM comparable.

### A.2 Comparativa con NVIDIA Jetson Orin / Thor (precios 2026)

| Equipo | Arq. | CPU | RAM | TOPS | Consumo | Precio aprox. |
|---|---|---|---|---|---|---|
| **Beelink EQR6** (actual) | x86-64 | Ryzen 5 6600U 6c/12t | 24 GB | iGPU (irrelevante) | 10-54W | ~300-400 USD |
| Jetson Orin Nano 8GB | ARM64 | 6c A78AE | 8 GB | 67 | 7-25W | 249 USD |
| Jetson Orin NX 16GB | ARM64 | 8c A78AE | 16 GB | 157 | 10-40W | 699 USD |
| Jetson AGX Orin 32GB | ARM64 | 8c A78AE | 32 GB | 200 | 15-75W | 1.099 USD |
| Jetson AGX Orin 64GB | ARM64 | 12c A78AE | 64 GB | 275 | 15-60W | 1.999 USD |
| Jetson AGX Thor T5000 | ARM64 | 14c Neoverse | 128 GB | ~2070 (FP4) | hasta 130W | 3.499 USD |

Para el diseño actual (APIs, sin Ollama) los Jetson **no aportan**: pagarías más por menos RAM, en
ARM, por una GPU ociosa. Su único eje fuerte (TOPS) es el que aquí no se usa.

### A.3 Cuándo y cómo meter una Jetson (decisión futura del usuario)

Escenario: querer **inferencia local privada** (la ruta Ollama aparcada en §0.2 y §9), para que ni
los datos anonimizados salgan del host. Entonces:

- **La Jetson NO sustituye al Beelink**: se añade como **nodo dedicado de inferencia** en la LAN. El
  Beelink sigue corriendo todo el sistema; la Jetson solo sirve modelos.
- **Integración limpia**: la Jetson expone un **endpoint compatible OpenAI** (Ollama o
  `llama.cpp`/TGI en JetPack). El **router de modelos** del cerebro (§5) enruta a ese endpoint las
  tareas sensibles a privacidad (compactación de memoria, síntesis sobre la bitácora) y deja en API
  pública lo no sensible. Es un cambio de **configuración**, no de arquitectura.
- **Qué modelo de Jetson**: para LLM útil en local, **AGX Orin 64GB** (o Thor) es lo mínimo serio;
  Orin Nano 8GB / NX 16GB solo mueven modelos pequeños (3B-8B cuantizados) y lentos. Ojo a ARM64 y
  a añadir NVMe vía carrier.
- **Alternativa a considerar en su momento**: una **GPU NVIDIA en un PC x86** suele dar más
  rendimiento por euro para inferencia que una AGX Orin, a cambio de más consumo. Evaluar según
  precio/W del momento.

Regla: **Beelink x86 = host del sistema; Jetson (u otra GPU) = nodo opcional solo-inferencia**, el
día que la privacidad pese más que el coste de tener IA local.

---

## Apéndice B. Suscripción CLI vs API por token (por qué API para el runtime)

### B.1 Sistema actual: Claude Code (suscripción) como cerebro

**Ventajas:**
- **Coste plano y predecible** (una sub), sin sorpresas por token. Para uso interactivo intenso
  puede salir más barato que API.
- **Cero infraestructura que construir**: Claude Code ya trae el bucle de agente, uso de
  herramientas, MCP, edición de ficheros, hooks (el `source_gate` va como hook `PreToolUse`) y
  gestión de contexto. Tienes un agente potente "gratis".
- **Modelo siempre al día** y muy capaz, ideal para **prototipar rápido**: el cerebro ya existe.

**Inconvenientes:**
- **No está pensado para producción headless 24/7**: arrancarlo con `--remote-control` + `tmux`
  para servir a un grupo es un apaño; una sesión se puede caer y no es un servicio con health/restart.
- **ToS y límites**: las suscripciones son para uso interactivo personal; el uso automatizado y
  multiusuario topa con límites y zona gris de condiciones.
- **Poco control**: difícil enrutar modelo por tarea, atribuir coste, observar (trazas) y meter
  evals como gate.
- **Orquestación pobre**: coordinar varios agentes especializados, scheduler y sub-agentes en
  paralelo es incómodo. Justo lo que necesitas para los dominios futuros (§14).

### B.2 Migración a Hermes + API: qué ganamos

- **Servicio residente real** 24/7 con scheduler, health, restart y gateway (Hermes está diseñado
  para despliegue autónomo de larga duración).
- **Router de modelos** (§5ter) y **control de coste** por token (presupuestos y límites).
- **Observabilidad + evals** como CI de los agentes (§8).
- **Orquestación multi-agente** (MCP/A2A, sub-agentes): la base para finanzas + calendario + tareas
  (§14).
- **Flexibilidad de proveedor**: cambiar de modelo o añadir local (Jetson) sin rediseño.

**Coste de la migración:** pagas por token (variable, hay que presupuestar) y **tienes que construir
y operar** la orquestación (Hermes, tools MCP, gates). Más trabajo inicial que "solo arrancar Claude
Code".

### B.3 Tendencia (2026) y encaje

- Las herramientas de coding (Claude Code, Codex) ofrecen cada vez más **SDK / modo headless**
  (Claude Agent SDK, Codex exec) para construir sobre su mismo motor: la frontera "CLI vs framework"
  se difumina.
- Los **sistemas de agentes en producción** usan **APIs + orquestación** (LangGraph y similares) con
  observabilidad/evals, **no** un CLI interactivo como runtime.
- **Routing de modelo por tarea** y **control de coste** son ya práctica estándar.
- Suscripciones (Max/Pro) = para **desarrollar**; APIs (o plataformas tipo Bedrock/Vertex) = para
  **producir**.

**Encaje para nuestro propósito** (producto 24/7, multiusuario, que crecerá a varios dominios de
agentes): **API + orquestación es lo correcto**. La suscripción/CLI no escala a multi-agente,
multi-dominio, programado y observable. **Decisión firme: empezamos de cero con Hermes + API como
runtime desde el día 1**, sin etapa puente de Claude Code como cerebro (descartamos el modelo
"runtime transitorio"). Claude Code y Codex se quedan, pero **solo para construir** el sistema.
