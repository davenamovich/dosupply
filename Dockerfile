# syntax=docker/dockerfile:1

# ---- dependencies ----
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- build ----
FROM oven/bun:1 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# db/ holds untracked runtime state, so a clean clone may not have it.
RUN mkdir -p db
RUN bunx prisma generate && bun run build

# ---- runtime ----
FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0

# Next standalone output already contains node_modules and server.js.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Runtime key store (db/runtime-keys.json); container filesystem is ephemeral.
COPY --from=build /app/db ./db

EXPOSE 3000
# Railway injects PORT; Next's standalone server reads it.
CMD ["bun", "server.js"]
