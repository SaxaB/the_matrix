-- 0005_finance_portfolio.sql — gestor de cartera y trade plans (diseño §9bis.1-2).
--
-- Pasa cash, operaciones y planes de prosa/bitácora a tablas. El agente (service_role)
-- escribe trade plans; los usuarios ven los suyos y los del grupo vía web.

-- Saldos de caja por divisa (ticker sintético CASH-{CCY} en §9bis.1)
create table finance.cash_balances (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  currency varchar(10) not null default 'USD',
  amount numeric(18, 4) not null default 0,
  updated_at timestamptz not null default now(),
  constraint cash_balances_user_ccy_unique unique (user_id, currency)
);

-- Operaciones (compras/ventas/dividendos): histórico para PnL realizado
create table finance.portfolio_operations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ticker varchar(20) not null,
  kind text not null check (kind in ('buy', 'sell', 'dividend', 'fee', 'deposit', 'withdrawal')),
  quantity numeric(18, 8),
  price numeric(18, 4),
  amount numeric(18, 4) not null,      -- efectivo con signo (compra negativa)
  currency varchar(10) not null default 'USD',
  executed_at timestamptz not null,
  note text,
  created_at timestamptz not null default now()
);

create index portfolio_operations_user_ticker_idx
  on finance.portfolio_operations (user_id, ticker, executed_at desc);

-- Trade plans (§9bis.2): produce el risk_engine, valida el risk_gate, decide el humano (L2)
create table finance.trade_plans (
  id uuid default gen_random_uuid() primary key,
  ticker varchar(20) not null,
  thesis_ref text,                      -- knowledge_pages:<slug> (F6)
  conviction numeric(4, 3) check (conviction >= 0 and conviction <= 1),
  position_pct_target numeric(6, 3) not null,
  entries jsonb not null,               -- [{px, weight}, ...] pesos suman 1.0
  stop_loss numeric(18, 4) not null,
  take_profits jsonb not null,          -- [{px, weight}, ...]
  r_multiple_target numeric(8, 3),
  max_loss_pct_portfolio numeric(6, 3),
  risk_score smallint,
  side text not null default 'long' check (side in ('long', 'short')),
  status text not null default 'draft'
    check (status in ('draft', 'gated', 'published', 'rejected', 'expired')),
  gate_result jsonb,                    -- veredicto íntegro del risk_gate
  created_by text not null default 'saxa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trade_plans_ticker_status_idx
  on finance.trade_plans (ticker, status, created_at desc);

create trigger trade_plans_updated_at
  before update on finance.trade_plans
  for each row execute function util.handle_updated_at();

-- RLS
alter table finance.cash_balances enable row level security;
alter table finance.portfolio_operations enable row level security;
alter table finance.trade_plans enable row level security;

create policy "Users manage own cash"
  on finance.cash_balances for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own operations"
  on finance.portfolio_operations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Los trade plans los escribe el agente (service_role salta RLS);
-- el grupo (autenticados) los lee — son recomendaciones L2 compartidas.
create policy "trade_plans_select_authenticated"
  on finance.trade_plans for select to authenticated using (true);

comment on table finance.trade_plans is
  'Planes §9bis.2: el risk_gate valida antes de publicar; ejecutar es SIEMPRE humano (L2/§8.2).';
