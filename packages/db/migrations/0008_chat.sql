-- 0008_chat.sql — canal de chat personal C3 (diseño §14.6).
--
-- Transporte v1: Postgres como bus + Realtime como push (§4bis). El cliente
-- inserta su mensaje (RLS), saxa lo procesa (service_role) y escribe la
-- respuesta; el móvil se repinta por Realtime. Una fachada HTTP/WS puede
-- envolver el mismo flujo más adelante sin tocar los agentes.
--
-- Privacidad: chat PERSONAL (cada usuario ve solo lo suyo); el grupo de
-- finanzas sigue en Telegram (C1). Conviven.

create schema if not exists chat;

grant usage on schema chat to anon, authenticated, service_role;
grant all on all tables in schema chat to anon, authenticated, service_role;
alter default privileges in schema chat
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema chat
  grant all on sequences to anon, authenticated, service_role;

create table chat.messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  domain text,                          -- dominio que respondió (finance, vault, ...)
  status text not null default 'done'
    check (status in ('pending', 'processing', 'done', 'error')),
  error text,
  created_at timestamptz not null default now()
);

create index messages_user_created_idx on chat.messages (user_id, created_at desc);
-- Cola de trabajo de saxa: solo mensajes de usuario pendientes
create index messages_pending_idx
  on chat.messages (created_at) where status = 'pending' and role = 'user';

alter table chat.messages enable row level security;

create policy "Users read own messages"
  on chat.messages for select using (auth.uid() = user_id);

-- El usuario solo inserta SUS mensajes 'user' en estado 'pending';
-- las respuestas las escribe saxa con service_role (salta RLS)
create policy "Users send own messages"
  on chat.messages for insert
  with check (auth.uid() = user_id and role = 'user' and status = 'pending');

comment on table chat.messages is
  'C3 §14.6: bus de chat personal. Cliente inserta pending; saxa responde; Realtime push.';

-- Realtime (§4bis): publicación WAL para las tablas con suscripción de clientes.
-- Incluye también finance.trade_plans (suscrita por la app móvil desde F4b).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table chat.messages;
alter publication supabase_realtime add table finance.trade_plans;
