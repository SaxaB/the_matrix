# the_matrix

Sistema unificado de agentes personales, autoalojado en un Beelink EQR6.

Un orquestador propio en Python — **saxa** — coordina 11 dominios de agentes (finanzas,
calendario, viajes, IoT, coche, vault, cultivos, emprendimiento, trading...), con un único
Postgres (Supabase self-hosted + Realtime) como contrato de datos, dashboard web + app móvil
como clientes y Telegram como canal de mensajería.

## Documentación

| Documento | Qué es |
|---|---|
| [`docs/DISENO-SISTEMA-UNIFICADO.md`](docs/DISENO-SISTEMA-UNIFICADO.md) | Espec canónica: visión, catálogo P1-P11, topología, modelo de datos, fases |
| [`docs/PLAN-CONSTRUCCION.md`](docs/PLAN-CONSTRUCCION.md) | Plan operativo: mapa de reutilización, fases F0-F9, riesgos |
| [`AGENTS.md`](AGENTS.md) | Guía para agentes que trabajen en este repo |
| `docs/contexto/` | Documentación de los dos proyectos fuente (FinAI, financial-freedom) |
| `docs/referencias/` | Arquitectura de referencia y material de apoyo |

## Arranque rápido (F0 + F1)

```sh
cp .env.example .env
sh infra/supabase/generate-keys.sh   # pegar la salida en .env
docker compose up -d                 # Postgres + Auth + API + Realtime + Studio + n8n

# Esquema (schemas market/finance, contrato en packages/db):
DATABASE_URL="postgres://postgres:<pass>@localhost:5432/postgres" packages/db/apply.sh

# Poblar datos de mercado (universo de índices US):
docker compose build etl
docker compose run --rm etl etl:preload
```

Studio queda en `http://localhost:8000`, n8n en `http://localhost:5678` (solo LAN).
Detalles en `infra/supabase/README.md`, `packages/db/README.md` y `apps/etl/README.md`.

## Estado

F0-F3 construidos: stack Supabase self-host, esquema consolidado (schemas
`market`/`finance`/`agent`), ETLs portados, dashboard web portado y **saxa**
(orquestador Python: router de modelos, presupuesto, loops con hard stops,
gates, gateway Telegram). `docker compose up` levanta todo. **Nada probado en
vivo aún**: el host destino (EQR6) no está listo; el smoke test F0-F3 es lo
primero al estrenarlo. Estado detallado por fases en `AGENTS.md`; plan en
`docs/PLAN-CONSTRUCCION.md`.
