# apps/client/mobile — app móvil (Expo)

Shell móvil de the_matrix (diseño §6bis): auth gate contra GoTrue self-host +
tabs por sección. Primera sección: **Finanzas** (Cartera y Trade plans, con
Realtime: saxa escribe un plan y la lista se repinta sola).

Consume `@matrix/client-shared` (cliente Supabase, formatters) y
`@matrix/section-finance` (queries, mappers, schemas) — cero lógica duplicada
con la web.

## Arrancar (requiere stack compose levantado)

```sh
pnpm install                       # raíz del monorepo
cd apps/client/mobile
cp .env.example .env               # EXPO_PUBLIC_SUPABASE_URL + ANON_KEY
npx expo install --fix             # alinea versiones nativas del SDK
pnpm start                         # QR para Expo Go / simulador
```

En LAN apunta a `http://<ip-del-eqr6>:8000`; fuera de casa necesita el tunnel
(decisión #9). Las `EXPO_PUBLIC_*` se inlinan en build.

## Pendiente de validación (sin EQR6)

`tsc --noEmit` pasa; la ejecución real (Expo Go contra GoTrue + PostgREST +
Realtime) queda para el smoke test. Las tabs de dominios F8 (calendar, travel,
iot...) se añadirán como nuevas secciones, igual que en la web.
