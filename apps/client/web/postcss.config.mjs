import path from "node:path";
import { fileURLToPath } from "node:url";

// `base` de Tailwind v4 = raíz de ESTA app web (donde vive src/ con las clases).
// En el monorepo pnpm no se puede derivar de require.resolve("tailwindcss")
// porque los symlinks de .pnpm llevan a un directorio equivocado y Tailwind
// escanearía donde no hay clases → CSS vacío. Lo fijamos al dir de la app.
const appRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Next.js (webpack) only accepts PostCSS plugins in a serializable shape — see
 * https://nextjs.org/docs/messages/postcss-shape
 */
export default {
  plugins: {
    "@tailwindcss/postcss": { base: appRoot },
  },
};
