#!/bin/sh
# Aplica las migraciones de packages/db/migrations/ en orden, una sola vez cada una.
# Registro en public.schema_migrations. Idempotente: relanzarlo no repite nada.
#
# Uso:
#   DATABASE_URL=postgres://postgres:<pass>@localhost:5432/postgres ./apply.sh
# o con el stack levantado y .env cargado:
#   DATABASE_URL="postgres://postgres:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-postgres}" ./apply.sh
#
# Requiere: psql en PATH y el stack arrancado al menos una vez (GoTrue crea auth.users).

set -eu

MIGRATIONS_DIR="$(cd "$(dirname "$0")/migrations" && pwd)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: define DATABASE_URL" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "
  create table if not exists public.schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  );"

for file in "$MIGRATIONS_DIR"/*.sql; do
  version="$(basename "$file" .sql)"
  applied="$(psql "$DATABASE_URL" -tA -c \
    "select 1 from public.schema_migrations where version = '$version'")"
  if [ "$applied" = "1" ]; then
    echo "skip  $version (ya aplicada)"
    continue
  fi
  echo "apply $version"
  # -1: cada migración en una transacción; si falla, no deja estado a medias
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -1 \
    -f "$file" \
    -c "insert into public.schema_migrations (version) values ('$version');"
done

echo "OK: migraciones al día."
