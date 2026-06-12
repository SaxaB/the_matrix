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

## Arranque rápido (F0)

```sh
cp .env.example .env
sh infra/supabase/generate-keys.sh   # pegar la salida en .env
docker compose up -d                 # Postgres + Auth + API + Realtime + Studio
```

Studio queda en `http://localhost:8000`. Detalles en `infra/supabase/README.md`.

## Estado

F0 construido (stack Supabase self-host + esqueleto monorepo). Ver fases en
`docs/PLAN-CONSTRUCCION.md`.
