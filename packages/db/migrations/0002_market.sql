-- 0002_market.sql — datos de mercado compartidos (schema `market`).
--
-- Origen: FinAI supabase/schema.sql + 9 migraciones, consolidadas en su estado final
-- (sin payload de companyfacts, con columnas earnings y finai_risk ya incluidas).
-- Cambios respecto a FinAI: tablas movidas de `public` a `market`.
--
-- Modelo de escritura: solo el ETL (service_role, salta RLS). Lectura: cualquier
-- usuario autenticado (datos de referencia, no personales).

-- Ticker ↔ CIK (de SEC company_tickers.json); tabla canónica del universo US
create table market.us_symbols (
  ticker varchar(12) primary key,
  cik varchar(10) not null,
  entity_name text not null,
  exchange text,
  updated_at timestamptz default now() not null
);

create index us_symbols_cik_idx on market.us_symbols (cik);

-- Marca de última ingesta de companyfacts por CIK (el JSON crudo no se persiste)
create table market.sec_companyfacts_snapshot (
  cik varchar(10) primary key,
  entity_name text,
  fetched_at timestamptz not null default now()
);

create index sec_companyfacts_snapshot_fetched_at_idx
  on market.sec_companyfacts_snapshot (fetched_at desc);

-- Métricas XBRL aplanadas (ETL con whitelist de conceptos) para gráficos y screening
create table market.sec_edgar_metrics (
  id uuid default gen_random_uuid() primary key,
  cik varchar(10) not null,
  ticker varchar(12),
  taxonomy text not null,
  concept text not null,
  label text,
  period_end date not null,
  value numeric not null,
  unit text not null,
  form text,
  filed date,
  fiscal_year int,
  fiscal_period text,
  accession text
);

create unique index sec_edgar_metrics_dedupe_idx
  on market.sec_edgar_metrics (
    cik,
    taxonomy,
    concept,
    period_end,
    unit,
    coalesce(fiscal_period, '')
  );

create index sec_edgar_metrics_ticker_concept_idx
  on market.sec_edgar_metrics (ticker, concept, period_end desc);

create index sec_edgar_metrics_cik_idx on market.sec_edgar_metrics (cik);

-- Yahoo Finance: barras EOD ligadas al ticker canónico
create table market.yahoo_eod_bars (
  ticker varchar(12) not null references market.us_symbols (ticker) on delete cascade,
  trade_date date not null,
  open numeric(18, 6),
  high numeric(18, 6),
  low numeric(18, 6),
  close numeric(18, 6) not null,
  adj_close numeric(18, 6),
  volume bigint,
  primary key (ticker, trade_date)
);

create index yahoo_eod_bars_ticker_date_desc_idx
  on market.yahoo_eod_bars (ticker, trade_date desc);

-- Yahoo Finance: snapshot de fundamentales + earnings + riesgo FinAI
create table market.yahoo_asset_snapshot (
  ticker varchar(12) primary key references market.us_symbols (ticker) on delete cascade,
  long_name text,
  sector text,
  industry text,
  market_cap bigint,
  trailing_pe numeric(18, 6),
  forward_pe numeric(18, 6),
  dividend_yield numeric(18, 8),
  beta numeric(18, 6),
  fifty_two_week_high numeric(18, 6),
  fifty_two_week_low numeric(18, 6),
  average_volume bigint,
  regular_market_volume bigint,
  currency varchar(10) default 'USD',
  exchange text,
  raw_summary jsonb,
  earnings_next_date date,
  earnings_is_estimate boolean,
  earnings_eps_consensus numeric(18, 6),
  earnings_revenue_consensus numeric(24, 2),
  fetched_at timestamptz not null default now(),
  finai_risk_score smallint,
  finai_risk_computed_at timestamptz,
  finai_risk_breakdown jsonb
);

comment on column market.yahoo_asset_snapshot.earnings_next_date is 'Próxima fecha de resultados (calendario US, YYYY-MM-DD).';
comment on column market.yahoo_asset_snapshot.earnings_is_estimate is 'Yahoo marca la fecha como estimada.';
comment on column market.yahoo_asset_snapshot.earnings_eps_consensus is 'Consenso EPS próximo periodo (earningsTrend/calendarEvents).';
comment on column market.yahoo_asset_snapshot.earnings_revenue_consensus is 'Consenso ingresos próximo periodo.';
comment on column market.yahoo_asset_snapshot.finai_risk_score is 'FinAI 5–95 risk heuristic (higher = more stress in analytics), from ETL.';
comment on column market.yahoo_asset_snapshot.finai_risk_computed_at is 'When finai_risk_score was last computed.';
comment on column market.yahoo_asset_snapshot.finai_risk_breakdown is 'JSON: model version, Spanish driver labels, stress/relief/dampen components.';

-- Caché compartida de cotizaciones (una fila por ticker; TTL en aplicación)
create table market.asset_quotes (
  ticker varchar(20) primary key,
  price numeric(18,4) not null check (price >= 0),
  currency varchar(10) not null default 'USD',
  fetched_at timestamptz not null default now()
);

create index asset_quotes_fetched_at_idx on market.asset_quotes (fetched_at);

-- RLS: lectura para autenticados; escritura solo service_role (salta RLS).
alter table market.us_symbols enable row level security;
alter table market.sec_companyfacts_snapshot enable row level security;
alter table market.sec_edgar_metrics enable row level security;
alter table market.yahoo_eod_bars enable row level security;
alter table market.yahoo_asset_snapshot enable row level security;
alter table market.asset_quotes enable row level security;

create policy "us_symbols_select_authenticated"
  on market.us_symbols for select to authenticated using (true);

create policy "sec_companyfacts_snapshot_select_authenticated"
  on market.sec_companyfacts_snapshot for select to authenticated using (true);

create policy "sec_edgar_metrics_select_authenticated"
  on market.sec_edgar_metrics for select to authenticated using (true);

create policy "yahoo_eod_bars_select_authenticated"
  on market.yahoo_eod_bars for select to authenticated using (true);

create policy "yahoo_asset_snapshot_select_authenticated"
  on market.yahoo_asset_snapshot for select to authenticated using (true);

create policy "asset_quotes_select_authenticated"
  on market.asset_quotes for select to authenticated using (true);

-- Excepción documentada a "escrituras de mercado = solo ETL": asset_quotes es una
-- caché compartida no sensible que las server actions de la web (sesión del usuario)
-- refrescan al pedir cotizaciones en vivo (patrón validado en FinAI). El resto de
-- tablas de market siguen siendo solo-ETL.
create policy "asset_quotes_insert_authenticated"
  on market.asset_quotes for insert to authenticated with check (true);

create policy "asset_quotes_update_authenticated"
  on market.asset_quotes for update to authenticated using (true) with check (true);
