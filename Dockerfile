# syntax=docker/dockerfile:1

# Motostock production image.
#
# Multi-stage build based on Next.js `output: "standalone"`:
#   1. deps   — install the full dependency tree (Prisma CLI included) once;
#   2. build  — generate the Prisma client and run `next build`;
#   3. runner — copy the traced server plus the Prisma CLI/schema/migrations,
#               then apply migrations and start the server at boot.
#
# The SQLite database lives on a mounted volume (see docker-compose.yml), so it
# survives container restarts and image rebuilds.

# ---- base ---------------------------------------------------------------
# Debian (glibc) matches the Prisma engine binary Next.js traces into the
# standalone output (`libquery_engine-debian-openssl-3.0.x.so.node`). OpenSSL
# is required by the Prisma engines.
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- deps ---------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- build --------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate the Prisma client before `next build` compiles the pages that
# import it.
RUN npx --no-install prisma generate
RUN npm run build

# ---- runner -------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create the non-root user first so COPY --chown can resolve it. The named
# volume mounted at /data (docker-compose.yml) inherits this ownership, so the
# persisted database stays writable.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /data \
  && chown nextjs:nodejs /data

# Traced standalone server (server.js, minimal node_modules, .next/server).
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets and public files are not traced; copy them explicitly.
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# The full dependency tree so `prisma migrate deploy` can run at startup and
# so the Prisma client + query engine are guaranteed present at runtime.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json

# Prisma schema + committed migrations for the startup migration step.
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma

COPY --chown=nextjs:nodejs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
