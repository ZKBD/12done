# Development stage - for local development with hot reload
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install since no lock file in dev)
RUN npm install

# Copy source files (volumes will override in dev)
COPY . .

# Default command for development (overridden by docker-compose)
CMD ["npm", "run", "dev"]

# Production build stage - requires network access for Google Fonts
FROM builder AS production-build

# Build args for Next.js public env vars (baked in at build time)
ARG NEXT_PUBLIC_API_URL=https://12done.com/api
ARG NEXT_PUBLIC_APP_URL=https://12done.com

# Set them as ENV for the build process
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=production-build /app/public ./public
COPY --from=production-build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=production-build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check using IPv4 to avoid localhost IPv6 resolution issues
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000 || exit 1

CMD ["node", "server.js"]
