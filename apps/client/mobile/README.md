# apps/client/mobile — app móvil (Expo)

Shell móvil de the_matrix (diseño §6bis): auth gate contra GoTrue self-host +
tabs por sección. Primera sección: **Finanzas** (Cartera y Trade plans, con
Realtime: saxa escribe un plan y la lista se repinta sola).

Consume `@matrix/client-shared` (cliente Supabase, formatters) y
`@matrix/section-finance` (queries, mappers, schemas) — cero lógica duplicada
con la web.

## Temas (selector en Ajustes)

Cuatro modos conmutables en caliente, con persistencia en `AsyncStorage`:

| Tema | Estilo |
|---|---|
| **Cristal** | Glassmorphism: superficies translúcidas con `expo-blur` (BlurView) sobre un degradado vivo (`expo-linear-gradient`). Estilo cristal líquido. |
| **Matrix** | Verde fosforito sobre negro, monospace, coherente con la web. |
| **Claro** | Limpio y luminoso. |
| **Oscuro** | Oscuro neutro. |

Arquitectura (`src/theme/`): `themes.ts` (tokens), `ThemeProvider` (context +
persistencia), `components.tsx` (`ScreenBackground`/`Surface`/`ThemeText`, que se
comportan distinto en `mode: 'glass'` vs `'solid'`), `ThemePicker`. Las pantallas
consumen tokens vía `useTheme()` — un cambio de tema repinta toda la app. Añadir
un tema = una entrada en `themes.ts`.

Nota técnica: en RN el "glass" no es `backdrop-filter` (no existe); es un BlurView
translúcido sobre un fondo con color/gradiente. Por eso el modo Cristal pinta un
degradado de fondo y las tarjetas desenfocan lo que tienen detrás.

## Voz (hablar y escuchar a saxa) — sin tokens API

En el tab Chat (`src/voice/`):

- 🎤 **Micro → texto**: botón de micro junto al input. Usa el reconocimiento de
  voz **nativo** del móvil (`expo-speech-recognition`, en español). Gratis, sin API.
- 🔊 **Modo audio**: toggle en la cabecera del chat. Cuando está activo, saxa lee
  en voz alta sus respuestas con el TTS **nativo** (`expo-speech`). Gratis, offline.
  Persistido en AsyncStorage.

Premium opcional (de pago, futuro): para voz hiper-realista se puede sustituir
`speak()` en `src/voice/speech.ts` por ElevenLabs/OpenAI TTS sin tocar la UI; el
contrato es solo `speak/stop`.

**Importante**: el dictado (STT) usa código nativo → requiere un **development
build** de Expo (`npx expo run:ios`/`run:android`), **no funciona en Expo Go**.
El TTS (modo audio) sí funciona en Expo Go. Permisos de micro ya declarados en
`app.json` (plugin `expo-speech-recognition`).

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
