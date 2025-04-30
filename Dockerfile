# === Build Stage ===
FROM node:20-bullseye AS builder

WORKDIR /app

# 1. Copy only dependency files first
COPY package.json package-lock.json ./
COPY next.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY tailwind.config.ts ./

RUN npm ci

# 2. Copy only necessary source files
COPY public/ ./public
COPY src/ ./src


# 3. Build the Next.js app
RUN npm run build

# Compile next.config.ts if needed
 RUN npx esbuild next.config.ts --outfile=next.config.js --platform=node --format=cjs

# === Runtime Stage ===
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Optional: security (drop root)
RUN useradd --system --uid 1001 nextjs
USER nextjs

# Copy only production assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["npm", "start"]
