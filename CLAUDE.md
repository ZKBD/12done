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
├── docs/                # Requirements and traceability
│   ├── LOWER_LEVEL_REQUIREMENTS.md
│   ├── LOWER_LEVEL_REQUIREMENTS_PART2.md
│   └── TRACEABILITY_MATRIX.md
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## Requirements Documentation

### SRS Reference
The Software Requirements Specification is in `12done_SRS.docx`. Requirements are tagged with IDs (e.g., PROD-001, USER-001) for traceability.

### Lower-Level Requirements
Detailed implementation tasks are in `docs/LOWER_LEVEL_REQUIREMENTS.md` and `docs/LOWER_LEVEL_REQUIREMENTS_PART2.md`. Each high-level SRS requirement is broken down into specific, implementable tasks with acceptance criteria.

### Traceability Matrix
The `docs/TRACEABILITY_MATRIX.md` links requirements to test cases and results.

## Current Phase: Phase 1 - Foundation
Focus areas:
- User authentication (PROD-001 to PROD-011)
- Property listings (PROD-020 to PROD-031)
- Basic search (PROD-040 to PROD-050)

## Testing Requirements
- Unit tests for all services and utilities
- E2E tests for API endpoints
- Run tests before committing: `docker-compose exec app npm test`

---

## MANDATORY: Traceability Matrix Maintenance

**IMPORTANT:** The traceability matrix at `docs/TRACEABILITY_MATRIX.md` MUST be kept up to date. This is a critical project requirement.

### When to Update the Matrix

Update the traceability matrix whenever:

1. **New requirements are added to the SRS**
   - Add new rows to the appropriate section
   - Set status to 🚧 (not yet implemented) or N/A
   - Include the requirement ID, description, and purpose

2. **New test cases are created**
   - Add entries linking the test to its requirement(s)
   - Include test file path and test case name
   - Write a clear "Purpose" explaining what's being tested
   - Set initial status to ⏳ (not yet run)

3. **Tests are executed**
   - Update status to ✅ (pass) or ❌ (fail)
   - Update the "Latest Test Run" section with date and results
   - Note any failures in the test execution summary

4. **Requirements are implemented**
   - Change status from 🚧 to ⏳
   - Link to the implementing test cases

### Matrix Update Procedure

```markdown
# When adding a new test case:
| PROD-XXX.Y | `testName > should do something` | file.spec.ts | Human-readable purpose | ⏳ |

# When running tests:
1. Run: docker-compose exec app npm test
2. Update status symbols (✅/❌) based on results
3. Update "Latest Test Run" table with date and summary
```

### Purpose Column Guidelines

The "Purpose" column must explain in plain English what the test verifies. Examples:

| Good Purpose | Bad Purpose |
|--------------|-------------|
| "Verifies user cannot register with existing email" | "Tests register endpoint" |
| "Ensures password is hashed before database storage" | "Checks password hashing" |
| "Confirms only property owner can delete listing" | "Tests authorization" |

### Status Symbols

| Symbol | Meaning | When to Use |
|--------|---------|-------------|
| ✅ | Pass | Test executed and passed |
| ❌ | Fail | Test executed and failed |
| ⏳ | Pending | Test exists but not yet run |
| 🚧 | Not Implemented | Requirement exists, no test yet |
| N/A | Not Applicable | No test needed for this requirement |

### After Each Work Session

Before ending a session where tests were created or modified:

1. Open `docs/TRACEABILITY_MATRIX.md`
2. Add any new test cases to appropriate sections
3. Update statuses if tests were run
4. Update the "Update History" section at the bottom
5. Commit changes with message: `docs: update traceability matrix`
