# infra/supabase

Config del stack Supabase **self-host** (gratis, open source) que orquesta el
`docker-compose.yml` de la raíz.

## Contenido

- `volumes/api/` — config declarativa de Kong (gateway) y su entrypoint
- `volumes/db/` — scripts SQL de inicialización de la imagen `supabase/postgres` (roles, realtime, webhooks, jwt...). Solo se ejecutan en el **primer** arranque, con el data dir vacío
- `volumes/db/data/` — datos de Postgres (**gitignored**, persiste entre reinicios)
- `volumes/snippets/`, `volumes/functions/` — carpetas que Studio espera montadas
- `generate-keys.sh` — genera los secrets para `.env`

## Procedencia y upgrades

`volumes/` está **vendorizado** del repo oficial [supabase/supabase](https://github.com/supabase/supabase/tree/master/docker)
(carpeta `docker/`), snapshot de 2026-06-11, emparejado con las versiones de
imagen fijadas en el compose:

| Servicio | Imagen |
|---|---|
| db | `supabase/postgres:15.8.1.085` |
| auth | `supabase/gotrue:v2.189.0` |
| rest | `postgrest/postgrest:v14.12` |
| realtime | `supabase/realtime:v2.102.3` |
| meta | `supabase/postgres-meta:v0.96.6` |
| studio | `supabase/studio:2026.06.03-sha-0bca601` |
| kong | `kong/kong:3.9.1` |

**Para actualizar**: subir las tags del compose **y** re-sincronizar `volumes/`
desde upstream en el mismo cambio (van emparejados). Nunca actualizar a ciegas:
GoTrue y Realtime traen migraciones propias.

Diferencias deliberadas respecto a upstream (ver cabecera del compose):
sin `storage`/`imgproxy` (entra en F8 con el vault), sin `edge-functions`,
sin `supavisor` (el puerto 5432 se publica directo desde `db`). `kong.yml`
se mantiene idéntico a upstream: las rutas `/storage/v1` y `/functions/v1`
existen pero devuelven 503 al no haber servicio detrás.

## Primer arranque

```sh
cp .env.example .env
sh infra/supabase/generate-keys.sh   # pegar la salida en .env
docker compose up -d
```

- Studio: `http://<host>:8000` (basic auth: `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`)
- API REST: `http://<host>:8000/rest/v1/`
- Postgres directo: `psql -h <host> -p 5432 -U postgres`

Si cambias `JWT_SECRET`/`POSTGRES_PASSWORD` después del primer arranque hay que
regenerar `ANON_KEY`/`SERVICE_ROLE_KEY` y, para la password, borrar
`volumes/db/data/` (o cambiarla vía SQL).
