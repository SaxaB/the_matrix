# apps/client/web — dashboard Next.js (output standalone).
# Construir SIEMPRE con contexto en la raíz del monorepo:
#   docker compose build web
# Las NEXT_PUBLIC_* se hornean en build: pasarlas como build args.

FROM node:22.16.0-alpine AS builder

RUN corepack enable
WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json packages/db/
COPY apps/etl/package.json apps/etl/
COPY apps/client/web/package.json apps/client/web/
RUN pnpm install --frozen-lockfile --filter @matrix/web...

COPY packages/db packages/db
COPY apps/etl apps/etl
COPY apps/client/web apps/client/web

RUN pnpm --filter @matrix/web build

FROM node:22.16.0-alpine AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=builder /app/apps/client/web/.next/standalone ./
COPY --from=builder /app/apps/client/web/.next/static ./apps/client/web/.next/static
COPY --from=builder /app/apps/client/web/public ./apps/client/web/public

EXPOSE 3000
CMD ["node", "apps/client/web/server.js"]
