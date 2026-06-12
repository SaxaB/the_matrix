-- 0006_radar.sql — radar / screener semanal (diseño §9bis.3).
--
-- El radar corre domingo (n8n) sobre el universo, escribe la lista rankeada
-- aquí, y aparece a la vez en Telegram (TL;DR) y en la web (Realtime), sin
-- duplicar lógica. Cada candidato lleva su trade plan preliminar (§9bis.2).

create table finance.radar_runs (
  id uuid default gen_random_uuid() primary key,
  ran_at timestamptz not null default now(),
  universe_size int not null,
  scored int not null,
  criteria jsonb not null,            -- snapshot de infra/radar-rules.yaml usado
  notes text
);

create table finance.radar_candidates (
  id uuid default gen_random_uuid() primary key,
  run_id uuid references finance.radar_runs (id) on delete cascade not null,
  rank int not null,
  ticker varchar(20) not null,
  total_score numeric(8, 4) not null,
  scores jsonb not null,              -- desglose por componente (technical, fundamental, risk, narrative)
  summary text,
  trade_plan_id uuid references finance.trade_plans (id) on delete set null,
  constraint radar_candidates_run_rank_unique unique (run_id, rank)
);

create index radar_candidates_run_idx on finance.radar_candidates (run_id, rank);
create index radar_candidates_ticker_idx on finance.radar_candidates (ticker);

alter table finance.radar_runs enable row level security;
alter table finance.radar_candidates enable row level security;

-- Escribe el agente (service_role); lee el grupo
create policy "radar_runs_select_authenticated"
  on finance.radar_runs for select to authenticated using (true);

create policy "radar_candidates_select_authenticated"
  on finance.radar_candidates for select to authenticated using (true);

comment on table finance.radar_candidates is
  'Lista de compra rankeada del radar semanal (§9bis.3); recomendación L2, decide el humano.';
