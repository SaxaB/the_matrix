import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const require = createRequire(__filename);

function getProjectRoot() {
  try {
    const pkgPath = require.resolve("tailwindcss/package.json");
    return path.dirname(path.dirname(path.dirname(pkgPath)));
  } catch {
    return path.dirname(__filename);
  }
}

const projectRoot = getProjectRoot();

/**
 * Next.js (webpack) only accepts PostCSS plugins in a serializable shape — see
 * https://nextjs.org/docs/messages/postcss-shape
 * Use string keys (no inline plugin objects, no [pluginFn, opts] tuples with custom fn).
 */
export default {
  plugins: {
    "@tailwindcss/postcss": { base: projectRoot },
  },
};
