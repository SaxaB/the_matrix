# Plan de construcción de the_matrix

> Documento operativo. La espec canónica del sistema es `docs/DISENO-SISTEMA-UNIFICADO.md`;
> este plan concreta **cómo** se construye: qué se trasplanta de los repos fuente, qué se
> escribe desde cero y en qué orden.

**Fecha**: 2026-06-11
**Repos fuente** (lectura bajo demanda, nunca se copian dentro de este repo):

- `/Users/alexmarin/Code/financial-freedom` — bot Telegram del grupo de traders (29 scripts Python, ~10.300 líneas en `tools/`, gates, AGENTS.md con reglas duras)
- `/Users/alexmarin/Code/FinAI` — webapp de cartera (110 ficheros TS, Next.js + Supabase, 9 migraciones SQL, ETLs SEC/Yahoo/risk funcionando)

---

## 1. Veredicto: ni desde cero ni fork. Monorepo nuevo + trasplante de órganos

- **El esqueleto es nuevo** (greenfield real): la estructura `apps/client + apps/agent + apps/etl + packages/db + infra/` (§12 del diseño) no existe en ningún repo. Se crea limpia.
- **Los órganos se trasplantan**: FinAI y financial-freedom tienen piezas maduras que sería absurdo reescribir.
- **No se forkea ninguno de los dos**: FinAI está acoplado a Supabase cloud/Vercel/GitHub Actions (descartados) y financial-freedom al runtime Claude Code por suscripción (también descartado). Forkear arrastraría justo lo que no queremos.

Grosso modo: **~40% del valor de F0-F5 ya está escrito** entre los dos repos. El otro 60%
(orquestación, runtime propio con API keys, móvil, dominios personales) es genuinamente nuevo.

## 2. Mapa de reutilización pieza a pieza

| Pieza | Origen | Decisión | Trabajo real |
|---|---|---|---|
| Esquema de mercado (`us_symbols`, `sec_edgar_metrics`, `yahoo_eod_bars`, `yahoo_asset_snapshot`) | FinAI `supabase/` | Copiar casi tal cual a `packages/db` | **Bajo**: consolidar 9 migraciones en esquema base + añadir schemas nuevos |
| ETL SEC/Yahoo/risk (TS) | FinAI `scripts/etl/` + `src/lib/etl/` | Portar con cambios mínimos | **Bajo-medio**: quitar GitHub Actions, apuntar a Postgres local, contenerizar; `ensureMarketDataForTicker` pasa a endpoint HTTP interno |
| `finai_risk_score` (5-95 determinista) | FinAI `src/lib/ticker-risk-score.ts` | Copiar tal cual | **Trivial** |
| UI Finanzas (dashboard, portfolio, stocks, perfil, onboarding) | FinAI `src/app/` | Portar reorganizando en `apps/client/web` + `sections/finance/` | **Medio**: separar shell genérico de la sección; auth contra GoTrue self-host |
| Lógica de tools (`dcf_manual`, `technical`, `finnhub_query`, `x_lists_fetch`, `valuation`) | financial-freedom `tools/scripts/` | Envolver como MCP, tocando poco el núcleo de cálculo | **Medio**: separar cálculo de I/O (hoy leen JSON/secrets ad-hoc, pasarán a Postgres) |
| Gates (`source_gate`, `telegram_md_lint`) | financial-freedom | Portar como middleware del agente | **Bajo** |
| Reglas duras (AGENTS.md) | financial-freedom | Heredar como constitución del dominio P1 | **Bajo**: es prosa, se filtra lo que aplica |
| `research_pipeline.py` | financial-freedom | Reescribir usándolo de espec (lo dice el propio diseño, §5) | **Alto** |
| Cerebro/orquestador (**saxa**: Hermes + router de modelos + LangGraph + presupuesto) | ninguno | Nuevo desde cero | **Alto**: es el corazón del proyecto |
| App móvil (Expo) | ninguno | Nuevo (F4) | **Alto** |
| Infra (Compose, Supabase self-host, cloudflared, n8n, Langfuse) | ninguno | Nuevo (config, no código) | **Medio** |
| Dominios P2-P11 | ninguno | Nuevos, sobre el patrón `domains/` + MCP | **Alto pero incremental** |

## 3. Por qué este proyecto es mucho más ambicioso que sus fuentes

Cambia de categoría en cinco ejes:

1. **De bot de nicho a plataforma**: financial-freedom es un bot de Telegram para 4 traders; FinAI una webapp de cartera. the_matrix es un orquestador de 11 dominios (finanzas, calendario, viajes, IoT, coche, vault, cultivos, emprendimiento, trading) con el mismo patrón arquitectónico.
2. **De runtime prestado a runtime propio**: hoy el "cerebro" es Claude Code por suscripción en tmux. El nuevo es código Python propio que llama a APIs por token, con router de modelos, presupuesto de coste y gates en código.
3. **De estático a vivo**: finfreedom publica JSON + rebuild + deploy. the_matrix usa Postgres + Realtime: el agente escribe una fila y web y móvil se repintan solas.
4. **De cloud a soberanía**: FinAI depende de Supabase cloud, Vercel y GitHub Actions. Todo eso muere: un solo host (EQR6), todo en Docker, datos sensibles que nunca salen (vault, IoT, BYD).
5. **De confianza a ingeniería**: observabilidad (Langfuse), evals como gate, niveles de autonomía L0-L4 con HITL para dinero. Ingeniería de agentes de producción, no scripting.

## 4. Fases de ejecución

Siguen las fases del diseño (§10), concretando trasplante vs escritura nueva:

### F0 — Infra base
Esqueleto del monorepo (§12) + Docker Compose con Supabase self-host (Postgres, GoTrue,
PostgREST, Realtime, Studio; **versiones fijadas**) + cloudflared.
**Entregable**: `docker compose up` levanta el stack vacío y accesible en el EQR6.

### F1 — Datos (trasplante FinAI puro)
`packages/db` con el esquema de mercado consolidado; portar los 4 ETLs TS a `apps/etl`
contenerizado; n8n con la cadencia ya validada (Yahoo diario, risk después, SEC semanal);
poblar universo ~500 tickers.
**Entregable**: Postgres lleno y actualizándose solo.

### F2 — Web (trasplante FinAI + shell nuevo)
`apps/client/web`: shell genérico (nav, auth, Realtime, estado agentes) + sección Finanzas
con las páginas de FinAI adaptadas.
**Entregable**: dashboard con datos reales servido desde el EQR6.

### F3 — Cerebro base (lo nuevo grande)
`apps/agent/core`: **saxa** (Hermes) + router de modelos (`infra/models.yaml`, API keys por
token) + gateway Telegram + primeras tools MCP envueltas de `tools/scripts/` + `source_gate`
+ Step 0 leyendo cartera de Postgres. Reescritura del research pipeline.
**Entregable**: briefing completo respondido por Telegram con datos en vivo.

### F4 — Cartera + riesgo + móvil
Tools `portfolio` y `risk_engine` + `risk_gate` + trade plans; app móvil v1 (Expo) con shell
+ Finanzas reutilizando `sections/` y `shared/`. Aquí entra la lectura IBKR si se decide
(T1/T2, solo lectura).

### F5-F7 — Radar, decisión, calidad
Screener semanal; LangGraph con HITL; `knowledge_pages` (wiki); Langfuse + evals + matriz de
autonomía L0-L4. Cierra P1 completo.

### F8 — Dominios personales (patrón repetido)
P2-P7, P9 (vault, cerrar decisión #10) y P10 (cultivos, decisión #11). Cada uno:
`domains/<x>/` + MCP + `sections/<x>/`. El coste marginal por dominio baja mucho si F3 dejó
el core realmente agnóstico.

### F9+ — C3 chat, P8 trading (rojo), P11 emprendimiento

## 5. Riesgos a vigilar desde ya

- **Acoplamiento oculto de los scripts Python**: leen `secrets.env`, JSON locales y rutas del mini PC viejo. El trasplante a MCP exige separar cálculo de I/O; es donde más sorpresas habrá.
- **Supabase self-host** es la pieza de infra con más fricción operativa (upgrades, GoTrue). Versiones fijadas en Compose desde F0.
- **No empezar F8 antes de que F3 esté limpio**: si saxa nace hardcodeado a finanzas, los otros 10 dominios lo pagan.

## 6. Decisiones cerradas en el arranque (complementan §11 del diseño)

| # | Decisión | Estado |
|---|---|---|
| 9 (parcial) | Nombre del proyecto/repo: **the_matrix** (`github.com/SaxaB/the_matrix`). Orquestador (Hermes): **saxa**. Dominio web y bundle id móvil siguen abiertos | **DECIDIDO 2026-06-11** |
| — | Los repos fuente **no se copian** dentro de este repo; se leen desde sus rutas absolutas | **DECIDIDO 2026-06-11** |
