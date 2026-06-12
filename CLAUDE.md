# CLAUDE.md — the_matrix

Lee `AGENTS.md` antes de tocar nada: es la guía operativa (qué es el proyecto, repos fuente, decisiones cerradas, convenciones, estado actual).

Reglas esenciales (detalle completo en AGENTS.md):

- **Espec canónica**: `docs/DISENO-SISTEMA-UNIFICADO.md`. Plan operativo: `docs/PLAN-CONSTRUCCION.md`.
- **Repos fuente** (minar, NUNCA copiar dentro): `/Users/alexmarin/Code/financial-freedom` y `/Users/alexmarin/Code/FinAI`.
- **Commits y push los hace el usuario**, salvo instrucción explícita.
- **Secrets jamás en git**: `.env` ignorado, `.env.example` como plantilla.
- **Sin pruebas en vivo todavía**: el host destino (Beelink EQR6) no está listo. Se construye en local y se valida sintaxis/lógica; todo lo que requiera Docker/Postgres corriendo queda marcado como pendiente de smoke test.
- Documentación en español; código e identificadores en inglés.
- Versiones de imágenes Docker fijadas en Compose.

Estado por fases: ver sección **Estado** al final de `AGENTS.md` (mantenerla al día al cerrar trabajo).
