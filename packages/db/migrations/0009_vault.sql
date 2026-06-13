-- 0009_vault.sql — vault documental P9 (diseño §14.9), SOLO METADATOS.
--
-- Independiente de la decisión #10 (backend de blobs: Paperless-ngx / MinIO /
-- otro): los metadatos estructurados viven SIEMPRE en Postgres, sea cual sea
-- el almacén del binario. `storage_ref` apunta al backend elegido.
--
-- Privacidad máxima (§14.9): schema privado, RLS de un solo usuario; los
-- ficheros nunca salen del host ni van a APIs de modelo (vault_gate en saxa).

create schema if not exists vault;

grant usage on schema vault to anon, authenticated, service_role;
grant all on all tables in schema vault to anon, authenticated, service_role;
alter default privileges in schema vault
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema vault
  grant all on sequences to anon, authenticated, service_role;

create table vault.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  doc_type text not null check (doc_type in
    ('identity', 'immigration', 'health', 'insurance', 'contract', 'tax', 'other')),
  holder text,                          -- titular (yo, pareja, ...)
  country varchar(2),                   -- ISO-3166-1 alfa-2
  issuer text,
  doc_number_last4 varchar(8),          -- NUNCA el número completo en metadatos
  issue_date date,
  expiry_date date,
  tags text[] not null default '{}',
  notes text,
  storage_backend text,                 -- decisión #10: paperless | minio | fs | ...
  storage_ref text,                     -- id/ruta del binario en ese backend
  status text not null default 'active'
    check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_idx on vault.documents (user_id, status);
create index documents_expiry_idx
  on vault.documents (expiry_date) where expiry_date is not null and status = 'active';

create trigger documents_updated_at
  before update on vault.documents
  for each row execute function util.handle_updated_at();

alter table vault.documents enable row level security;

-- RLS estricta: solo el dueño. El grupo de finanzas JAMÁS ve el vault.
create policy "Owner full access"
  on vault.documents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table vault.documents is
  'P9 §14.9: metadatos de documentos. El binario vive en el backend de #10 y nunca va a un LLM.';
