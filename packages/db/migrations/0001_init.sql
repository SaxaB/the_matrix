-- 0001_init.sql — schemas por dominio + utilidades compartidas.
--
-- Convención the_matrix (diseño §14.4.3): un schema de Postgres por dominio.
--   market   → datos de mercado compartidos (referencia; escribe el ETL, lee todo usuario autenticado)
--   finance  → datos de cartera/perfil por usuario (P1; RLS por usuario)
--   util     → funciones de utilidad sin dominio
-- Los dominios F8+ (calendar, vault, cultivos, ...) añadirán su schema en su propia migración.
--
-- Requiere el stack Supabase ya arrancado una vez (GoTrue crea auth.users en su primer boot).

create schema if not exists market;
create schema if not exists finance;
create schema if not exists util;

-- Roles estándar de Supabase self-host (creados por infra/supabase/volumes/db/roles.sql)
grant usage on schema market to anon, authenticated, service_role;
grant usage on schema finance to anon, authenticated, service_role;
grant usage on schema util to anon, authenticated, service_role;

-- PostgREST/Realtime necesitan privilegios sobre tablas presentes y futuras de cada schema.
-- La RLS de cada tabla es la que decide después qué filas ve cada rol.
grant all on all tables in schema market to anon, authenticated, service_role;
grant all on all sequences in schema market to anon, authenticated, service_role;
alter default privileges in schema market
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema market
  grant all on sequences to anon, authenticated, service_role;

grant all on all tables in schema finance to anon, authenticated, service_role;
grant all on all sequences in schema finance to anon, authenticated, service_role;
alter default privileges in schema finance
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema finance
  grant all on sequences to anon, authenticated, service_role;

-- Trigger genérico de updated_at (origen: FinAI public.handle_updated_at)
create or replace function util.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

grant execute on function util.handle_updated_at() to anon, authenticated, service_role;
