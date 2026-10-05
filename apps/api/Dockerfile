# Multi-stage Dockerfile per Backend NestJS (Alpine Linux con Prisma Engine generato in container)

# --- STAGE 1: Dipendenze e Generazione Prisma ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY schema.prisma ./schema.prisma

# Installazione dipendenze complete
RUN npm ci

# Esegui prisma generate DIRETTAMENTE su Alpine Linux per scaricare i binari corretti musl
RUN npx prisma generate

# --- STAGE 2: Builder NestJS ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compila shared e api
RUN npm run build --workspace=@harukaizen/shared || true
RUN npm run build --workspace=api

# Prune delle sole dipendenze di produzione
RUN npm prune --production

# --- STAGE 3: Production Runner (< 180MB, non-root) ---
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Creazione utente non-root sicuro
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs

# Copia solo node_modules di produzione, schema prisma e build compilata
COPY --from=builder --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nestjs /app/schema.prisma ./schema.prisma
COPY --from=builder --chown=nestjs:nestjs /app/package.json ./package.json

# Cartella per uploads progress persistente con permessi appropriati
RUN mkdir -p /app/uploads/progress && chown -R nestjs:nestjs /app/uploads

USER nestjs

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]

