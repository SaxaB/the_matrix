-- 0007_knowledge.sql — memoria que compone (diseño §9bis.5).
--
-- knowledge_pages: una síntesis VIVA por ticker/tema/tesis que se actualiza
-- (no se reconstruye). Las Threads/Temas/Tesis del financial-freedom actual
-- son la semilla conceptual; aquí pasan a tabla.
-- market_events: memoria episódica de eventos de mercado relevantes.

create table finance.knowledge_pages (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,            -- p. ej. ticker:nvda | tesis:hbm-2026 | tema:ia-semis
  kind text not null check (kind in ('ticker', 'thesis', 'theme')),
  title text not null,
  content_md text not null default '',
  confidence numeric(4, 3) check (confidence >= 0 and confidence <= 1),
  drivers jsonb not null default '[]',          -- [{driver, direction, evidence}]
  links jsonb not null default '[]',            -- [{url|slug, label}]
  open_questions jsonb not null default '[]',   -- ["¿...?"]
  sources jsonb not null default '[]',          -- procedencia de la última actualización
  version int not null default 1,
  updated_by text not null default 'saxa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_pages_kind_idx on finance.knowledge_pages (kind, updated_at desc);

create trigger knowledge_pages_updated_at
  before update on finance.knowledge_pages
  for each row execute function util.handle_updated_at();

create table finance.market_events (
  id uuid default gen_random_uuid() primary key,
  occurred_at timestamptz not null,
  ticker varchar(20),
  kind text not null,                   -- earnings | guidance | macro | incident | note
  headline text not null,
  detail text,
  source text,                          -- tool/url de procedencia
  page_slug text references finance.knowledge_pages (slug) on delete set null,
  created_at timestamptz not null default now()
);

create index market_events_ticker_idx on finance.market_events (ticker, occurred_at desc);
create index market_events_occurred_idx on finance.market_events (occurred_at desc);

alter table finance.knowledge_pages enable row level security;
alter table finance.market_events enable row level security;

-- Escribe el agente (service_role); lee el grupo (la wiki sale también en la web)
create policy "knowledge_pages_select_authenticated"
  on finance.knowledge_pages for select to authenticated using (true);

create policy "market_events_select_authenticated"
  on finance.market_events for select to authenticated using (true);

comment on table finance.knowledge_pages is
  'LLM Wiki §9bis.5: síntesis viva por ticker/tema/tesis; se ACTUALIZA, no se reconstruye.';
comment on table finance.market_events is
  'Memoria episódica de mercado; alimenta la compactación nocturna de la wiki.';
