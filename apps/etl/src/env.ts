/**
 * Carga del entorno para los jobs ETL.
 *
 * Orden de búsqueda del fichero .env (no pisa variables ya presentes en el
 * entorno, p. ej. las inyectadas por docker compose):
 *   1. ETL_ENV_FILE (ruta explícita)
 *   2. .env en la raíz del monorepo (dos niveles arriba de apps/etl)
 *   3. .env en cwd
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseAndApply(path: string): void {
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

export function loadEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.ETL_ENV_FILE,
    resolve(here, "../../../.env"),
    join(process.cwd(), ".env"),
  ].filter((p): p is string => !!p);

  for (const p of candidates) {
    if (existsSync(p)) {
      parseAndApply(p);
      return;
    }
  }
}
