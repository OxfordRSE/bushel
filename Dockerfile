# === Build Stage ===
FROM node:20-bullseye AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Convert next.config.ts → next.config.js for runtime
RUN npx esbuild next.config.ts --outfile=next.config.js --platform=node --format=cjs


# === Runtime Stage ===
FROM node:20-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# Optional: security
RUN useradd --system --uid 1001 nextjs
USER nextjs

# Copy only necessary output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

# Healthcheck: fail if homepage doesn't return HTTP 200
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node_modules/.bin/next", "start"]
