# FinAI — Datos, fuentes y pipeline de actualización

Documento de referencia sobre **de dónde sale la información de análisis**, **cómo se obtiene** y **cómo se actualiza la base de datos** (incluida la automatización con GitHub Actions). Complementa a `AGENTS.md` (convenciones), `README.md` (quick start) y `supabase/README.md` (setup + ETL detallado).

> Toda la UI está en español. La BD vive en **Supabase (PostgreSQL)**. Los ETL son procesos de servidor (nunca cliente) y escriben con la **service role key**.

---

## 1. Arquitectura — dónde corre cada cosa

| Capa | Dónde corre | Detalle |
|------|-------------|---------|
| **Base de datos + Auth** | **Supabase** (PostgreSQL gestionado en la nube) | Tablas de app y de mercado, RLS por `auth.uid()`, autenticación (email + Google OAuth). Plan **gratis = 500 MB** (ver §7) |
| **App web (Next.js 16)** | **Vercel** (destino previsto/asumido) | Frontend + **Server Actions** en Node. Lee de Supabase con la anon key (RLS) y, en operaciones de servidor, con la service role. Cotización/calendario macro se resuelven en runtime. *Nota: no hay `vercel.json` en el repo; Vercel se referencia en código y README como host objetivo, pero el despliegue concreto no está versionado aquí.* |
| **ETL por lotes** | **GitHub Actions** (runners `ubuntu-latest`, Node 20) | Workflows en `.github/workflows/` con cron + ejecución manual. Escriben en Supabase con `SUPABASE_SERVICE_ROLE_KEY` (secret del repo). Ver §5 |
| **Backfill on-demand** | Dentro de la **app web** (Server Action) | `ensureMarketDataForTicker` se dispara al añadir un holding sin datos; corre en el mismo entorno que la app (Vercel) |
| **Fuentes externas** | Terceros (no son infraestructura propia) | SEC EDGAR, Yahoo Finance, Finviz, Anthropic, Alpha Vantage |

**Flujo resumido:**

```
GitHub Actions (cron)               Usuario (navegador)
   │ etl:yahoo / etl:sec                  │
   │ etl:ticker-risk                      ▼
   ▼                              App Next.js (Vercel)
Supabase (PostgreSQL) ◀───────── Server Actions / RLS
   ▲                                      │
   └──────── backfill on-demand ──────────┘
        (ensureMarketDataForTicker)

Fuentes externas: SEC EDGAR · Yahoo Finance · Finviz · Anthropic · Alpha Vantage
```

Separación clave: la **app** (Vercel) sirve la UI y operaciones cortas en runtime; los **ETL pesados** (~500 tickers) corren fuera, en **GitHub Actions**, porque exceden los límites de tiempo de las funciones serverless de Vercel. Ambos comparten una única BD: **Supabase**.

---

## 2. Fuentes de datos

| Fuente | Qué aporta | Cómo se obtiene | Coste / requisitos |
|--------|------------|-----------------|--------------------|
| **SEC EDGAR** (`data.sec.gov`, `www.sec.gov`) | Fundamentales US-GAAP (ingresos, beneficio, balance, flujos de caja, EPS…) y mapa **ticker ↔ CIK** | API XBRL `companyfacts` + fichero público `company_tickers.json` | Gratis. Requiere cabecera `SEC_EDGAR_USER_AGENT` (p. ej. `FinAI/1.0 (tu@email.com)`) |
| **Yahoo Finance** (`yahoo-finance2`) | Precios **EOD** (velas diarias OHLCV) + **snapshot** de ratios (market cap, P/E, beta, dividend yield, máximos/mínimos 52 semanas) + **calendario de resultados** y consenso EPS/ingresos | Librería `yahoo-finance2` (`chart`, `quoteSummary`, `calendarEvents`) | Gratis, sin API key. Sujeto a límites/ToS de Yahoo |
| **Finviz** (página pública) | Calendario macroeconómico para la tarjeta «Contexto del día» del dashboard | JSON embebido en el HTML público; cacheado ~60 min en servidor (`unstable_cache`) | Gratis, sin key |
| **Claude / Anthropic** (opcional) | Texto interpretativo del informe de perfil (`/perfil`) y explicación del riesgo de un ticker | SDK `@anthropic-ai/sdk` **solo en servidor** | Requiere `ANTHROPIC_API_KEY`. No es fuente de datos de mercado; solo redacta sobre datos ya calculados |
| **Alpha Vantage** (opcional/redundancia) | Cotización puntual en `/stocks` si la key está configurada | API REST | Requiere `ALPHA_VANTAGE_API_KEY` |

**Universo cubierto:** unión de **S&P 500 ∪ Nasdaq-100 ∪ Dow Jones** (~500–520 tickers resueltos en `us_symbols`). Las listas se descargan de fuentes públicas (CSV de S&P en GitHub, Wikipedia raw para NDX y DJIA) en `src/lib/etl/index-universe.ts`.

---

## 3. Modelo de datos (tablas que llena el pipeline)

| Tabla | Origen | Contenido | Notas de tamaño |
|-------|--------|-----------|-----------------|
| `us_symbols` | SEC | Mapa ticker → CIK + nombre/exchange | Pequeña |
| `sec_companyfacts_snapshot` | SEC | Marca de cuándo se descargaron los facts por CIK (la columna `payload` con el JSON crudo **se eliminó** para ahorrar espacio) | Pequeña |
| `sec_edgar_metrics` | SEC | Métricas fundamentales **aplanadas** (una fila por concepto/periodo/unidad) | **La tabla más pesada.** Ver §7 |
| `yahoo_eod_bars` | Yahoo | Velas diarias OHLCV por ticker | Media (≈2 años por ticker) |
| `yahoo_asset_snapshot` | Yahoo + ETL riesgo | Ratios + `raw_summary` (JSON Yahoo) + columnas de resultados + `finai_risk_*` | `raw_summary` es ligero (~2 MB en total) |
| `asset_quotes` | App | Caché de cotización por ticker (TTL en app) | Pequeña |
| `holdings`, `user_profiles`, `portfolio_daily_values` | App / usuario | Cartera, perfil de riesgo, valor diario | Pequeñas |

El esquema completo está en `supabase/schema.sql`; los cambios incrementales en `supabase/migrations/`.

---

## 4. Cómo se obtiene y procesa la información (ETL)

Los scripts viven en `scripts/etl/` y comparten lógica en `src/lib/etl/`. Comandos npm:

```bash
npm run etl:sec            # SEC EDGAR (company facts + symbols)
npm run etl:yahoo          # Yahoo Finance (velas EOD + snapshot)
npm run etl:ticker-risk    # Recalcula finai_risk_score por ticker
npm run etl:preload-indices# Precarga masiva del universo de índices
```

### 4.1 SEC EDGAR (`etl:sec` → `sec-edgar-core.ts`)

1. **Sync de símbolos** (`--sync-symbols`): descarga `company_tickers.json` y llena `us_symbols` (ticker ↔ CIK). No descarga aún los facts.
2. **Ingesta de company facts** (`--symbols AAPL,MSFT` o `--universe indices`):
   - Resuelve el CIK del ticker.
   - Descarga `…/api/xbrl/companyfacts/CIK##########.json` (con reintentos ante 502/503/504).
   - Actualiza la marca en `sec_companyfacts_snapshot`.
   - **Aplana** el JSON a filas con `flattenCompanyFactsToMetrics` y reemplaza las métricas del CIK en `sec_edgar_metrics` (delete + insert por lotes).
3. **Filtros al aplanar** (claves para no inflar la BD): solo se persiste la taxonomía **`us-gaap`**, solo los **conceptos de la whitelist** (`src/lib/sec-edgar/concept-whitelist.ts`, ~35 conceptos) y solo periodos con `period_end >= SEC_METRICS_MIN_PERIOD_END` (por defecto `2016-01-01`). Ver §7.
4. **`--skip-if-fetched-days N`**: evita volver a llamar a la API si el snapshot del CIK es reciente (ideal en cron).

### 4.2 Yahoo Finance (`etl:yahoo` → `yahoo-ingest-core.ts`)

1. **Snapshot** (`quoteSummary`, módulos price/summaryDetail/summaryProfile/defaultKeyStatistics/calendarEvents/earningsTrend): un `upsert` por ticker en `yahoo_asset_snapshot` con ratios + `raw_summary` (JSON) + próximas fechas de resultados y consenso.
2. **Velas EOD** (`chart`, intervalo `1d`) en `yahoo_eod_bars`:
   - **Incremental (por defecto):** pide solo el rango nuevo desde la última fecha guardada y hace `upsert` por `(ticker, trade_date)`. Recomendado a diario.
   - **Full (`--full`):** borra las velas del ticker y recarga ~2 años (precarga o corrección total).

### 4.3 Riesgo FinAI (`etl:ticker-risk` → `ticker-risk-scores.ts`)

Recalcula `finai_risk_score` (escala 5–95, heurística determinista; **no es consejo de inversión**) y su `finai_risk_breakdown` en `yahoo_asset_snapshot`. Combina tres capas:

- **Yahoo snapshot:** beta, P/E, dividend yield, market cap, posición frente a máximos/mínimos de 52 semanas.
- **Serie EOD** (`yahoo_eod_bars`, ventana ~420 días): volatilidad/momentum a partir de cierres.
- **SEC** (`sec_edgar_metrics`, us-gaap, whitelist): calidad fundamental (`secQualityFromMetricRows`).

Por eso conviene ejecutarlo **después** de Yahoo (y con SEC ya ingerido). Lógica de scoring en `src/lib/ticker-risk-score.ts`.

### 4.4 Precarga masiva (`etl:preload-indices`)

Recorre el universo S&P ∪ NDX ∪ Dow y, para cada ticker que **no tenga datos**, corre SEC (full) y Yahoo (full). Útil para poblar una BD nueva.

```bash
npm run etl:preload-indices -- --dry-run       # solo lista
npm run etl:preload-indices -- --sync-symbols  # primero llena us_symbols
npm run etl:preload-indices -- --limit 20      # prueba acotada
```

### 4.5 Backfill on-demand al añadir un holding

Cuando un usuario añade una posición y faltan datos de ese ticker, el servidor puede lanzar `ensureMarketDataForTicker` (`src/lib/etl/ensure-market-data.ts`): corre SEC + Yahoo + recalcula el riesgo de ese único ticker. Requiere `SUPABASE_SERVICE_ROLE_KEY` (y `SEC_EDGAR_USER_AGENT` para la capa SEC). Si el ticker no es US-listed devuelve `NOT_US_LISTED`.

---

## 5. Actualización de la BD con GitHub Actions

Los ETL se ejecutan en CI desde `.github/workflows/`. Los `schedule` (cron) están en **UTC** y solo se aplican en la rama por defecto del repo.

| Workflow | Disparador | Comando | Timeout |
|----------|-----------|---------|---------|
| `etl-yahoo-daily.yml` | Cron `0 6 * * *` (diario, ~tras cierre US) + manual | `etl:yahoo -- --universe indices` | 180 min |
| `etl-ticker-risk-daily.yml` | Cron `30 6 * * *` (diario, tras Yahoo) + manual | `etl:ticker-risk` | 60 min |
| `etl-sec-weekly.yml` | Cron `0 5 * * 1` (lunes) + manual | `etl:sec -- --universe indices --skip-if-fetched-days 7` | 360 min |

**Orden lógico diario:** Yahoo (06:00) → riesgo (06:30). SEC va semanal porque los fundamentales cambian poco.

### Secrets requeridos (Settings → Secrets and variables → Actions)

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; nunca en cliente ni en `NEXT_PUBLIC_*`)
- `SEC_EDGAR_USER_AGENT` (obligatorio para el workflow SEC)

### Ejecutar manualmente

Pestaña **Actions** → elige el workflow → **Run workflow** (`workflow_dispatch`). Si falla por timeout o límites de API, sube `timeout-minutes` en el YAML o reduce el universo (`--limit` en una copia del comando para pruebas).

> Para la app desplegada en Vercel, los ETL siguen siendo procesos aparte (no uses Vercel Cron para jobs largos de ~500 tickers). Alternativas: VPS con cron, runners autoalojados.

---

## 6. Cadencia recomendada

| Qué | Frecuencia |
|-----|------------|
| Yahoo incremental + snapshot | Diaria (tras cierre US) |
| Riesgo FinAI (`etl:ticker-risk`) | Diaria, tras Yahoo |
| SEC company facts | Semanal o cada 7–14 días (con `--skip-if-fetched-days`) |
| `etl:sec --sync-symbols` | Puntual, al refrescar el listado US completo |

---

## 7. Notas de almacenamiento (cuota Supabase)

La BD gratis de Supabase tiene **500 MB**. El peso se concentra en `sec_edgar_metrics`, así que el pipeline aplica varios límites para mantenerla pequeña:

- Solo se persiste la taxonomía **`us-gaap`** (se descartan `dei`, `srt`, `ifrs-full`, etc., que la app nunca consulta).
- Solo los **conceptos de la whitelist** (`concept-whitelist.ts`).
- Solo periodos con `period_end >= SEC_METRICS_MIN_PERIOD_END` (env, por defecto **`2016-01-01`**). Para conservar más historia, baja esa fecha y re-ingesta (el ETL no descargará lo que quede fuera del corte).

**Consulta de tamaño** (SQL Editor):

```sql
select pg_size_pretty(pg_database_size(current_database())) as base_total;

select
  c.relname as tabla,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total,
  pg_size_pretty(pg_indexes_size(c.oid))        as indices
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by pg_total_relation_size(c.oid) desc;
```

Tras borrados masivos, recupera el espacio físico (fuera de transacción):

```sql
vacuum full public.sec_edgar_metrics;
reindex table public.sec_edgar_metrics;
```

> `DELETE` y columnas dropeadas no liberan espacio hasta un `VACUUM FULL`/`REINDEX`. `pg_database_size` no baja hasta ejecutarlos.

---

## 8. Variables de entorno relevantes para datos

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App + RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | ETL / backfill / RPC (solo servidor) |
| `SEC_EDGAR_USER_AGENT` | Obligatorio para llamadas a la SEC |
| `SEC_METRICS_MIN_PERIOD_END` | Corte de histórico SEC al ingerir (default `2016-01-01`) |
| `ANTHROPIC_API_KEY` | Texto IA del informe de perfil (opcional, servidor) |
| `ALPHA_VANTAGE_API_KEY` | Cotización puntual en `/stocks` (opcional) |
| `DASHBOARD_CALENDAR_TZ` | Zona del calendario macro (default `Europe/Madrid`) |
| `EARNINGS_DATE_TZ` | Zona para el día civil de resultados (default `America/New_York`) |

---

## 9. Archivos clave del pipeline

```
scripts/etl/
├── sec-edgar-ingest.ts     # CLI SEC (symbols + company facts)
├── yahoo-ingest.ts         # CLI Yahoo (velas + snapshot)
├── ticker-risk-scores.ts   # CLI riesgo FinAI (todo el universo)
└── preload-indices.ts      # Precarga S&P ∪ NDX ∪ Dow

src/lib/etl/
├── sec-edgar-core.ts       # Lógica SEC + secMetricsMinPeriodEnd()
├── yahoo-ingest-core.ts    # Lógica Yahoo (snapshot + EOD)
├── ticker-risk-single.ts   # Riesgo de un ticker (usado por backfill)
├── ensure-market-data.ts   # Backfill on-demand al añadir holding
└── index-universe.ts       # Carga listas de índices

src/lib/sec-edgar/
├── parse-companyfacts.ts   # Aplana companyfacts → filas (filtra us-gaap + whitelist + minPeriodEnd)
└── concept-whitelist.ts    # Conceptos US-GAAP persistidos

.github/workflows/          # Automatización ETL (ver §5)
supabase/schema.sql         # Esquema completo
supabase/migrations/        # Cambios versionados
supabase/README.md          # Setup Supabase + ETL detallado (sección 8)
```
