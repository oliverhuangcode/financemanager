# syntax=docker/dockerfile:1
# Built for linux/arm64 in GitHub Actions (see .github/workflows/deploy.yml)
# and run by Dokploy on the Oracle server.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ── build ─────────────────────────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Runtime env (DATABASE_URL, AUTH_*, BASIQ_*) comes from Dokploy, not the image.
ENV SKIP_ENV_VALIDATION=1 NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ── run ───────────────────────────────────────────────────────────────────────
FROM base AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 HOSTNAME=0.0.0.0 \
    # Behind Traefik + Cloudflare: trust the forwarded host for OAuth callbacks.
    AUTH_TRUST_HOST=true

# Prisma CLI for `migrate deploy` on start (standalone output doesn't include it).
RUN npm install -g prisma@6.19.2 --no-audit --no-fund

RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --chown=app:app docker-entrypoint.sh ./
USER app

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
