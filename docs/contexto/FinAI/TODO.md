# TODO / ideas — FinAI

Estado alineado con **AGENTS.md** y el código actual. Los ETL y tablas de mercado están documentados en **`supabase/README.md`** (sección 8).

## Hecho (referencia)

- [x] Supabase: esquema, tipos, auth, acciones servidor (holdings, perfil de riesgo).
- [x] Onboarding + edición de encuesta en **`/perfil/encuesta`**.
- [x] Portafolio: alta/baja; **venta parcial/total a efectivo** (`sellHoldingToCash`); efectivo como `CASH-{divisa}`.
- [x] Datos de mercado: scripts **SEC EDGAR** + **Yahoo Finance** (`npm run etl:sec`, `etl:yahoo`, `etl:preload-indices`); backfill en servidor cuando hay service role y variables ETL.
- [x] Página de valor con cotización, fundamentales y análisis opcional vía **OpenAI en servidor** (sin chat flotante en la app).
- [x] Middleware: rutas públicas (`/`, login, signup, `/auth/*`, `/api/*`); perfil de riesgo obligatorio para dashboard/portfolio/analysis/stocks/perfil/ajustes.

## Configuración / operación

- [ ] Revisar periodicamente **límites y ToS** de Yahoo y SEC; ajustar cadencia ETL y caché.
- [ ] Automatizar ETL (cron o GitHub Actions) con `SUPABASE_SERVICE_ROLE_KEY` y secretos; usar `--skip-if-fetched-days` en SEC donde aplique.

## Producto y datos

- [ ] Integración **Alpha Vantage** u otra fuente si hace falta redundancia (además de Yahoo/SEC).
- [ ] Capa de **noticias y sentimiento** (on-demand o programada).
- [ ] **Notificaciones** (eventos corporativos, resultados).
- [ ] Cuestionario de riesgo ampliado (apalancamiento, cripto, estilo MiFID II).
- [ ] **Caché** agresiva para APIs externas y deduplicación de llamadas.

## Técnicas

- [ ] Tests (unitarios / e2e) para acciones críticas y ETL.
- [ ] Observabilidad (logs estructurados, alertas en fallos ETL).

---

*Ideas sueltas: scoring determinista local de activos; export PDF; multi-moneda explícita en UI.*
