# 12done.com - Project Instructions

## Overview
12done.com (OneTwoDone) is a comprehensive real estate and services platform featuring property listings, service provider marketplace, AI tour guide, and referral-based business model.

## Tech Stack
- **Backend:** NestJS (TypeScript) with Prisma ORM
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Payments:** Stripe (Phase 2)
- **Maps:** Google Maps API
- **Email:** SendGrid (production), MailHog (development)
- **Containerization:** Docker & Docker Compose

## Development Commands
All commands run inside Docker containers:

```bash
# Start development environment
docker-compose up --build

# Run migrations
docker-compose exec app npx prisma migrate dev

# Generate Prisma client
docker-compose exec app npx prisma generate

# Run tests
docker-compose exec app npm test

# Run e2e tests
docker-compose exec app npm run test:e2e

# View logs
docker-compose logs -f app

# Access database
docker-compose exec db psql -U postgres -d twelvedone
```

## Project Structure
```
12done.com/
├── prisma/              # Database schema and migrations
├── src/
│   ├── common/          # Shared utilities, guards, decorators
│   ├── config/          # Configuration modules
│   ├── modules/         # Feature modules
│   │   ├── auth/        # Authentication
│   │   ├── users/       # User management
│   │   ├── properties/  # Property listings
│   │   ├── search/      # Search functionality
│   │   └── ...
│   ├── app.module.ts
│   └── main.ts
├── test/                # E2E tests
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## SRS Reference
The Software Requirements Specification is in `12done_SRS.docx`. Requirements are tagged with IDs (e.g., PROD-001, USER-001) for traceability.

## Current Phase: Phase 1 - Foundation
Focus areas:
- User authentication (PROD-001 to PROD-011)
- Property listings (PROD-020 to PROD-031)
- Basic search (PROD-040 to PROD-050)

## Testing Requirements
- Unit tests for all services and utilities
- E2E tests for API endpoints
- Run tests before committing: `docker-compose exec app npm test`
