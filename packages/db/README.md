# packages/db — contrato único de datos

Esquema SQL y migraciones de the_matrix. Es **la única fuente del modelo de datos**:
la web (TS), el agente (Python) y el ETL (TS) consumen lo que aquí se define; ningún
componente crea tablas por su cuenta.

## Convención: un schema de Postgres por dominio (diseño §14.4.3)

| Schema | Dominio | Dueño de los datos | Escritura | Lectura |
|---|---|---|---|---|
| `market` | Datos de mercado (universo US, SEC EDGAR, Yahoo, caché de quotes) | compartido (referencia) | solo ETL/agente (`service_role`) | cualquier usuario autenticado |
| `finance` | P1: cartera, perfil inversor, histórico diario | cada usuario | el propio usuario (RLS `auth.uid()`) | el propio usuario |
| `util` | Funciones de utilidad (`handle_updated_at`) | — | — | — |

Los dominios de F8+ (calendar, vault, cultivos, iot, ...) añadirán su propio schema con
su migración, siguiendo el mismo patrón. Los schemas personales sensibles (vault, iot)
llevarán RLS estricta de un solo usuario.

## Migraciones

Ficheros `migrations/NNNN_nombre.sql`, orden lexicográfico, **inmutables una vez
aplicadas en el EQR6** (cambios nuevos = migración nueva).

- `0001_init.sql` — schemas, grants, `util.handle_updated_at()`
- `0002_market.sql` — tablas de mercado (origen: FinAI, estado final consolidado de schema.sql + 9 migraciones)
- `0003_finance.sql` — tablas P1 por usuario (origen: FinAI)
- `0004_agent.sql` — schema `agent` del runtime saxa: `llm_spend` (presupuesto §5ter.2), `loop_runs` (§5quater), `approvals` (HITL §8.2); solo service_role
- `0005_finance_portfolio.sql` — gestor de cartera §9bis: `cash_balances`, `portfolio_operations`, `trade_plans` (escribe el agente, lee el grupo; publicar es decisión humana)
- `0006_radar.sql` — radar semanal §9bis.3: `radar_runs`, `radar_candidates` (lista rankeada con plan preliminar enlazado)

### Aplicar

```sh
# Con el stack de docker-compose levantado (al menos un primer boot completo,
# para que GoTrue haya creado auth.users):
DATABASE_URL="postgres://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres" ./apply.sh
```

El runner registra cada migración en `public.schema_migrations` y es idempotente.

## Notas de trasplante (FinAI → the_matrix)

- En FinAI todo vivía en `public`; aquí se separa en `market`/`finance`. El código que
  se porte de FinAI (ETLs, UI) debe actualizar las referencias de tabla.
- `PGRST_DB_SCHEMAS` en `.env` debe incluir `market` y `finance` para que PostgREST
  (y supabase-js con `.schema('market')`) los exponga. Ya está en `.env.example`.
- La política de FinAI que dejaba a usuarios autenticados escribir `asset_quotes` se
  eliminó: toda escritura de mercado pasa por el ETL (`service_role`).
- Realtime: cuando la web (F2) necesite suscripciones, añadir las tablas a la
  publicación `supabase_realtime` en una migración nueva.

## Pendiente de validación (sin EQR6 todavía)

Las migraciones están validadas solo en sintaxis/lectura. El smoke test real
(stack arriba + `apply.sh` + PostgREST sirviendo `market`/`finance`) queda para
cuando haya host con Docker.
