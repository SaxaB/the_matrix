-- 0010_travel.sql — dominio P4 travel (§14.7): 90-day report TM47 de inmigración TH.
--
-- Modela el ciclo del TM47: perfil de identidad (autofill del formulario),
-- entradas a Tailandia (cada entrada reinicia el contador de 90 días) e
-- historial/scheduling de reports con su aprobación HITL y captura previa.
--
-- Privacidad: datos personales sensibles → schema privado, RLS de un solo
-- usuario. El submit del report es ÁMBAR (§8.2): saxa rellena, el humano aprueba.

create schema if not exists travel;

grant usage on schema travel to anon, authenticated, service_role;
grant all on all tables in schema travel to anon, authenticated, service_role;
alter default privileges in schema travel
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema travel
  grant all on sequences to anon, authenticated, service_role;

-- Perfil para autorrellenar el TM47 (datos estables; el usuario los sube cuando quiera)
create table travel.tm47_profile (
  user_id uuid references auth.users(id) on delete cascade primary key,
  passport_no text,
  nationality text,                     -- p. ej. SPANISH (valor que espera el portal)
  surname text,
  given_name text,
  middle_name text,
  gender text check (gender in ('Male', 'Female') or gender is null),
  date_of_birth date,
  building_name text,
  address_no text,
  soi_road text,
  province text,
  city_amphur text,
  district_tambon text,
  phone text,
  portal_email text,                    -- usuario del portal (la contraseña va en secrets.env, NO aquí)
  updated_at timestamptz not null default now()
);

-- Entradas a Tailandia: la fecha de llegada reinicia el ciclo de 90 días
create table travel.entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  arrival_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index entries_user_arrival_idx on travel.entries (user_id, arrival_date desc);

-- Historial + scheduling de reports TM47
create table travel.tm47_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  due_date date,                        -- próximo vencimiento calculado
  filed_date date,                      -- fecha de presentación efectiva
  channel text not null default 'online' check (channel in ('online', 'in_person')),
  status text not null default 'scheduled' check (status in
    ('scheduled', 'preparing', 'awaiting_approval', 'submitted',
     'approved', 'rejected', 'in_person', 'cancelled')),
  approval_id uuid references agent.approvals (id) on delete set null,
  form_payload jsonb,                   -- campos rellenados (auditoría; sin nº pasaporte completo si se prefiere)
  screenshot_ref text,                  -- captura previa al envío (para la tarjeta del chat)
  receipt_ref text,                     -- PDF de notificación devuelto por el portal
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tm47_reports_user_due_idx on travel.tm47_reports (user_id, due_date desc);
create index tm47_reports_status_idx on travel.tm47_reports (status);

create trigger tm47_profile_updated_at
  before update on travel.tm47_profile
  for each row execute function util.handle_updated_at();

create trigger tm47_reports_updated_at
  before update on travel.tm47_reports
  for each row execute function util.handle_updated_at();

alter table travel.tm47_profile enable row level security;
alter table travel.entries enable row level security;
alter table travel.tm47_reports enable row level security;

create policy "Owner profile" on travel.tm47_profile for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Owner entries" on travel.entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Owner reports" on travel.tm47_reports for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table travel.tm47_reports is
  'Ciclo TM47 §14.7: saxa rellena y captura; el envío es ámbar (aprobación humana, §8.2).';
comment on column travel.tm47_profile.portal_email is
  'Usuario del portal de inmigración. La contraseña NUNCA en BD: va en secrets.env del host.';
