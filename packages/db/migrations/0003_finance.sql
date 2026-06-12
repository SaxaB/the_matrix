-- 0003_finance.sql — dominio P1 finanzas: datos por usuario (schema `finance`).
--
-- Origen: FinAI supabase/schema.sql (user_profiles, holdings, portfolio_daily_values),
-- consolidado con las migraciones de ai_investor_report y questionnaire_edited_at.
-- Cambios respecto a FinAI: tablas movidas de `public` a `finance`; enums al mismo schema.
--
-- RLS estricta: cada usuario solo ve y toca sus filas (auth.uid()).

create type finance.risk_level as enum ('conservative', 'moderate', 'aggressive');
create type finance.asset_class as enum ('stocks', 'bonds', 'cash', 'alternatives');

-- Perfil inversor (resultado del cuestionario de riesgo)
create table finance.user_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  risk_level finance.risk_level not null,
  risk_score numeric(5,2) not null check (risk_score >= 0 and risk_score <= 100),
  questionnaire_answers jsonb default '{}',
  ai_investor_report text,
  ai_investor_report_at timestamptz,
  questionnaire_edited_at timestamptz null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint user_profiles_user_id_unique unique (user_id)
);

comment on column finance.user_profiles.ai_investor_report is
  'Markdown informe técnico generado en servidor; sin PII en el prompt (payload anonimizado).';
comment on column finance.user_profiles.ai_investor_report_at is
  'Momento de la última generación del informe IA.';
comment on column finance.user_profiles.questionnaire_edited_at is
  'Última vez que el usuario guardó la encuesta desde la página de edición (no onboarding).';

-- Posiciones de cartera (patrón Order/Account de Ghostfolio, simplificado)
create table finance.holdings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ticker varchar(20) not null,
  name varchar(255) not null,
  quantity numeric(18,8) not null check (quantity > 0),
  avg_price numeric(18,4) not null check (avg_price >= 0),
  current_price numeric(18,4) not null default 0,
  asset_class finance.asset_class not null default 'stocks',
  sector varchar(100) default 'Other',
  currency varchar(10) default 'USD',
  price_updated_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index holdings_user_id_idx on finance.holdings(user_id);
create index holdings_ticker_idx on finance.holdings(ticker);

-- Valor diario total de la cartera (gráfico del dashboard; solo datos reales)
create table finance.portfolio_daily_values (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  snapshot_date date not null,
  total_value numeric(18,4) not null check (total_value >= 0),
  created_at timestamptz default now() not null,
  constraint portfolio_daily_values_user_date_unique unique (user_id, snapshot_date)
);

create index portfolio_daily_values_user_date_idx
  on finance.portfolio_daily_values (user_id, snapshot_date desc);

-- updated_at automático
create trigger user_profiles_updated_at
  before update on finance.user_profiles
  for each row execute function util.handle_updated_at();

create trigger holdings_updated_at
  before update on finance.holdings
  for each row execute function util.handle_updated_at();

-- RLS
alter table finance.user_profiles enable row level security;
alter table finance.holdings enable row level security;
alter table finance.portfolio_daily_values enable row level security;

create policy "Users can view own profile"
  on finance.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on finance.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on finance.user_profiles for update
  using (auth.uid() = user_id);

create policy "Users can view own holdings"
  on finance.holdings for select
  using (auth.uid() = user_id);

create policy "Users can insert own holdings"
  on finance.holdings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own holdings"
  on finance.holdings for update
  using (auth.uid() = user_id);

create policy "Users can delete own holdings"
  on finance.holdings for delete
  using (auth.uid() = user_id);

create policy "Users can view own portfolio daily values"
  on finance.portfolio_daily_values for select
  using (auth.uid() = user_id);

create policy "Users can insert own portfolio daily values"
  on finance.portfolio_daily_values for insert
  with check (auth.uid() = user_id);

create policy "Users can update own portfolio daily values"
  on finance.portfolio_daily_values for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own portfolio daily values"
  on finance.portfolio_daily_values for delete
  using (auth.uid() = user_id);
