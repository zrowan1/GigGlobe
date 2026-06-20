# Multi-stage build of the GigGlobe app image.
# The final image runs the Next.js "standalone" server: a small self-contained
# Node bundle (see output: 'standalone' in next.config.ts).

# Shared base.
FROM node:20-alpine AS base

# 1. Install dependencies (cached unless package files change).
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build the app.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3. Runtime image: only what's needed to run the server.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Media volume mount point, owned by the runtime user so uploads can be written.
# NOTE: when MEDIA_DIR is a host *bind mount*, the host folder's ownership wins,
# so it must be writable by uid 1001 (see README). This chown covers the
# named-volume / non-bind case.
RUN mkdir -p /media && chown nextjs:nodejs /media

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
