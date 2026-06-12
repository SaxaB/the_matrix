# apps/etl — contenedor one-shot para los jobs ETL de mercado.
# Construir SIEMPRE con contexto en la raíz del monorepo (necesita packages/db):
#   docker compose build etl
# Ejecutar un job:
#   docker compose run --rm etl etl:yahoo -- --universe indices

FROM node:22.16.0-alpine

RUN corepack enable

WORKDIR /app

# Capa de dependencias (cacheable): manifiestos del workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json packages/db/
COPY apps/etl/package.json apps/etl/
RUN pnpm install --frozen-lockfile --filter @matrix/etl...

# Código
COPY packages/db packages/db
COPY apps/etl apps/etl

WORKDIR /app/apps/etl

ENTRYPOINT ["pnpm"]
CMD ["etl:yahoo"]
