# AGENTS.md — the_matrix

Guía para cualquier agente (o humano) que trabaje en este repo. Léela antes de tocar nada.

## Qué es este proyecto

**the_matrix** es un sistema unificado de agentes personales autoalojado en un Beelink EQR6
(Ubuntu + Docker). Un orquestador propio en Python — **saxa** (arquitectura Hermes) — coordina
11 dominios de agentes (P1 finanzas primero), con dashboard web + app móvil como clientes y
Telegram como canal. Todo sobre un único Postgres (Supabase self-hosted) con Realtime.

- **Espec canónica**: `docs/DISENO-SISTEMA-UNIFICADO.md` (visión, catálogo P1-P11, topología, fases F0-F9, decisiones). Ante cualquier duda de diseño, manda ese documento.
- **Plan operativo**: `docs/PLAN-CONSTRUCCION.md` (qué se trasplanta de cada repo fuente, qué se escribe nuevo, fases y riesgos).

## Repos fuente (minar, no copiar)

Este proyecto trasplanta código de dos repos vecinos. **Nunca se copian dentro de este repo**;
se leen desde sus rutas absolutas cuando haga falta extraer algo:

| Repo | Ruta | Qué se extrae |
|---|---|---|
| financial-freedom | `/Users/alexmarin/Code/financial-freedom` | Lógica de tools (`tools/scripts/`: dcf_manual, technical, finnhub_query, x_lists_fetch, valuation), gates (`source_gate`, `telegram_md_lint`), reglas duras de su `AGENTS.md` (constitución del dominio P1), `research_pipeline.py` como espec |
| FinAI | `/Users/alexmarin/Code/FinAI` | Esquema SQL de mercado (`supabase/`, 9 migraciones), ETLs SEC/Yahoo/risk (`scripts/etl/`, `src/lib/etl/`), `ticker-risk-score.ts`, UI de finanzas (`src/app/`) |

Documentación de contexto de ambos ya versionada en `docs/contexto/`.

## Decisiones que no se discuten (resumen de §11 del diseño)

1. Runtime propio (saxa/Hermes + APIs de modelo por token). Claude Code/Codex **solo para construir**, nunca como runtime.
2. Sin Ollama por ahora; APIs públicas con regla estricta de no enviar PII.
3. Todo self-hosted en el EQR6: Supabase self-host, nada de Supabase cloud / Vercel / GitHub Actions para runtime.
4. Monorepo (estructura en §12 del diseño): `apps/{client,agent,etl}`, `packages/db`, `infra/`, `evals/`.
5. `packages/db` es el contrato único de datos entre web (TS), agente (Python) y ETL (TS).
6. ETL de mercado en TS; escrituras del agente en Python; Postgres+Realtime de pegamento.

## Convenciones

- **Secrets**: jamás en git. `.env` (ignorado) + `.env.example` versionado como plantilla.
- **Idioma**: documentación y comunicación en español; código e identificadores en inglés.
- **Commits y push los hace el usuario**, salvo instrucción explícita en contrario.
- **No sobre-ingenierizar**: cada pieza con su gate y su eval; fases que entregan valor solas (F0-F2 ya dan un portal útil sin capa agéntica).
- Versiones de imágenes Docker **fijadas** en Compose (especialmente Supabase self-host).

## Estado

- 2026-06-11: bootstrap del repo (docs + plan). Siguiente: F0 (esqueleto monorepo + Docker Compose).
