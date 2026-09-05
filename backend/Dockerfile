FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (requires a dummy DATABASE_URL for prisma.config.ts to evaluate)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" npx prisma generate

# Build NestJS
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Required for Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/seed.js ./

EXPOSE 5000
ENV PORT=5000

# Run prisma migrate deploy, seed the database, and start prod
CMD ["sh", "-c", "npx prisma migrate deploy && node seed.js && npm run start:prod"]
