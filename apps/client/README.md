# apps/client — C2: dashboard web + app móvil

Estructura del árbol del diseño (§Catálogo):

| Dir | Qué es | Estado |
|---|---|---|
| `web/` | UI Next.js (shell + páginas) | F2 ✅ (port de FinAI) |
| `mobile/` | UI Expo (tabs + pantallas RN) | F4b ✅ (v1: Cartera, Trade plans, Ajustes) |
| `shared/` | TS puro sin UI de plataforma: cliente Supabase, tipos, formatters | F4b ✅ |
| `sections/finance/` | Lógica del dominio P1: queries, mappers, schemas Zod | F4b ✅ |
| `sections/<resto>/` | calendar, tasks, travel, iot, reports, car, vault, cultivos, emprendimiento | F8/F9+ |

Convergencia pendiente (incremental, sin prisa): la web aún usa sus server
actions propias para la mayoría de datos; puede ir adoptando
`@matrix/section-finance` en client components donde aplique. La app móvil ya
consume exclusivamente `shared` + `sections`.
