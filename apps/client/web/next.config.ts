import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const nm = (pkg: string) => path.join(projectRoot, "node_modules", pkg);

const nmAliases = {
  tailwindcss: nm("tailwindcss"),
  "tw-animate-css": nm("tw-animate-css"),
  shadcn: nm("shadcn"),
  "@tailwindcss/postcss": nm("@tailwindcss/postcss"),
} as const;

const nextConfig: NextConfig = {
  // Imagen Docker fina: runtime autocontenido en .next/standalone
  output: "standalone",
  // Paquetes workspace en TS plano (fuera del dir de la app): Next los transpila
  transpilePackages: ["@matrix/db", "@matrix/etl"],
  // Raíz = monorepo, para que Turbopack vea packages/ y apps/etl
  turbopack: {
    root: path.join(projectRoot, "../../.."),
    resolveAlias: nmAliases,
  },
  // `next dev --webpack` uses this; keeps CSS/package resolution inside this repo (same as turbopack).
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | false | string[]>),
      ...nmAliases,
    };
    return config;
  },
};

export default nextConfig;
