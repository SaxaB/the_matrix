#!/bin/sh
# Genera los secrets de Supabase self-host para .env:
# JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY (HS256), POSTGRES_PASSWORD,
# SECRET_KEY_BASE y PG_META_CRYPTO_KEY.
#
# Uso: sh infra/supabase/generate-keys.sh
# Copia la salida a tu .env (no toca ningún fichero).

set -eu

b64url() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}

sign_jwt() {
  role="$1"
  secret="$2"
  now=$(date +%s)
  exp=$((now + 10 * 365 * 24 * 3600))  # 10 años
  header=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  payload=$(printf '{"role":"%s","iss":"the_matrix","iat":%s,"exp":%s}' "$role" "$now" "$exp" | b64url)
  sig=$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -hmac "$secret" -binary | b64url)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}

rand() { openssl rand -base64 "$1" | tr -d '\n=+/' | cut -c1-"$2"; }

JWT_SECRET=$(rand 48 40)

echo "# Generado $(date -u +%Y-%m-%dT%H:%M:%SZ) — pegar en .env"
echo "POSTGRES_PASSWORD=$(rand 48 40)"
echo "JWT_SECRET=$JWT_SECRET"
echo "ANON_KEY=$(sign_jwt anon "$JWT_SECRET")"
echo "SERVICE_ROLE_KEY=$(sign_jwt service_role "$JWT_SECRET")"
echo "DASHBOARD_PASSWORD=$(rand 24 20)"
echo "SECRET_KEY_BASE=$(openssl rand -base64 48 | tr -d '\n')"
echo "PG_META_CRYPTO_KEY=$(rand 48 32)"
