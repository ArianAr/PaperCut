# PaperCut — multi-stage production image (Next.js standalone + SQLite)
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY cli/package.json ./cli/
RUN pnpm install --frozen-lockfile

COPY server ./server
COPY cli ./cli

ENV NODE_ENV=production
WORKDIR /app/server
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/data/papercut.db
ENV PAPERCUT_PUBLIC_URL=http://localhost:3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /data \
  && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/server/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/server/.next/static ./server/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/server/public ./server/public

USER nextjs
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/server.js"]
