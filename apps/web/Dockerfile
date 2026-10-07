# Multi-stage Dockerfile per Next.js 16 Web Dashboard (Output Standalone ultra-leggero < 150MB)

# --- STAGE 1: Dipendenze ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copia file di definizione monorepo per caching ottimale
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/shared ./packages/shared
COPY apps/web/package*.json ./apps/web/
COPY schema.prisma ./schema.prisma

# Installazione dipendenze pulita
RUN npm ci

# --- STAGE 2: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variabili d'ambiente per il build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compila librerie condivise
RUN npm run build --workspace=@harukaizen/shared

# Compilazione standalone Next.js
RUN npm run build --workspace=web

# --- STAGE 3: Production Runner (Non-root, < 150MB) ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Creazione utente non-root sicuro per esecuzione
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia public e artefatti statici essenziali per CSS, immagini e font
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3001
EXPOSE 3000

CMD ["node", "apps/web/server.js"]

