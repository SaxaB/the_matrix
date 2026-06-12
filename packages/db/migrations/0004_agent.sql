-- 0004_agent.sql — estado del runtime de agentes (schema `agent`).
--
-- Solo lo toca saxa (service_role / conexión directa); no se expone por
-- PostgREST a clientes. Tablas:
--   llm_spend       gasto por llamada (presupuesto §5ter.2, atribución por tarea)
--   loop_runs       ejecuciones de loops con hard stop y resultado (§5quater)
--   approvals       acciones ámbar/rojas pendientes de HITL (§8.2)

create schema if not exists agent;

grant usage on schema agent to service_role;
grant all on all tables in schema agent to service_role;
alter default privileges in schema agent grant all on tables to service_role;
alter default privileges in schema agent grant all on sequences to service_role;

create table agent.llm_spend (
  id bigint generated always as identity primary key,
  day date not null,
  task text not null,
  model text not null,
  cost_usd numeric(10, 6) not null check (cost_usd >= 0),
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);

create index llm_spend_day_task_idx on agent.llm_spend (day, task);

create table agent.loop_runs (
  id uuid default gen_random_uuid() primary key,
  loop_name text not null,
  domain text not null,
  trigger_source text,                -- telegram | n8n | manual
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stop_reason text,                   -- done | max_iterations | timeout | budget | ...
  iterations int not null default 0,
  tool_calls int not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  error text,
  result jsonb
);

create index loop_runs_loop_started_idx on agent.loop_runs (loop_name, started_at desc);

create table agent.approvals (
  id uuid default gen_random_uuid() primary key,
  domain text not null,
  action_kind text not null,          -- p. ej. trade_plan_publish
  severity text not null check (severity in ('amber', 'red')),
  payload jsonb not null,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decision text check (decision in ('approved', 'rejected')),
  decided_by text,                    -- identificador humano (telegram user)
  loop_run_id uuid references agent.loop_runs (id) on delete set null
);

create index approvals_pending_idx
  on agent.approvals (requested_at desc) where decided_at is null;

comment on table agent.llm_spend is 'Una fila por llamada a modelo; presupuesto diario/por tarea (§5ter.2).';
comment on table agent.loop_runs is 'Ejecuciones de loops del catálogo infra/loops.yaml (§5quater).';
comment on table agent.approvals is 'Cola HITL: acciones ámbar (confirmar) y rojas (obligatorio) (§8.2).';
