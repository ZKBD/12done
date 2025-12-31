# ====================
# Base Stage
# ====================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ====================
# Development Stage
# ====================
FROM base AS development
ENV NODE_ENV=development

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "start:dev"]

# ====================
# Build Stage
# ====================
FROM base AS builder

COPY package*.json ./
# Install all dependencies including devDependencies for build
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate
RUN npm run build

# Prune dev dependencies after build
ENV NODE_ENV=production
RUN npm prune --production

# ====================
# Production Stage
# ====================
FROM base AS production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Create uploads directory and fix permissions
RUN mkdir -p /app/uploads && \
    chown -R nestjs:nodejs /app/uploads && \
    chmod -R 644 /app/prisma/migrations/*/migration.sql 2>/dev/null || true

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]
