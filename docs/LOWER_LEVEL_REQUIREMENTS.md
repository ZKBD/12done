# 12done.com Lower-Level Requirements Specification

**Version:** 1.0
**Derived From:** 12done_SRS.docx
**Date:** December 2025

This document breaks down the high-level SRS requirements into specific, implementable tasks with acceptance criteria. Each lower-level requirement traces back to its parent SRS requirement ID.

---

## Table of Contents

1. [User Management](#1-user-management)
2. [Property Listings](#2-property-listings)
3. [Search & Discovery](#3-search--discovery)
4. [Service Providers](#4-service-providers)
5. [Insurance & Mortgage](#5-insurance--mortgage)
6. [Negotiations & Transactions](#6-negotiations--transactions)
7. [Property Management](#7-property-management)
8. [AI Tour Guide](#8-ai-tour-guide)
9. [Stay Planning](#9-stay-planning)
10. [Neighborhood & Location](#10-neighborhood--location)
11. [Financial Tools](#11-financial-tools)
12. [Agent Features](#12-agent-features)
13. [Communication](#13-communication)
14. [Booking & Policies](#14-booking--policies)
15. [Legal & Documentation](#15-legal--documentation)
16. [Comparison & Analytics](#16-comparison--analytics)
17. [Tenant Screening](#17-tenant-screening)
18. [Smart Home & IoT](#18-smart-home--iot)
19. [Moving & Relocation](#19-moving--relocation)
20. [Social & Community](#20-social--community)
21. [Sustainability](#21-sustainability)
22. [Emergency & Safety](#22-emergency--safety)
23. [Health & Lifestyle](#23-health--lifestyle)
24. [Senior Living](#24-senior-living)
25. [Partnerships](#25-partnerships)
26. [Accessibility](#26-accessibility)
27. [Non-Functional Requirements](#27-non-functional-requirements)
28. [Technology Requirements](#28-technology-requirements)
29. [DevOps Requirements](#29-devops-requirements)
30. [Admin Requirements](#30-admin-requirements)
31. [Business Model](#31-business-model)

---

## 1. User Management

### PROD-001: User Registration

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-001.1 | Create registration form UI | Form includes email, firstName, lastName, password, confirmPassword fields | P0 |
| PROD-001.2 | Implement email format validation | Email must match RFC 5322 format, show inline error | P0 |
| PROD-001.3 | Implement password strength validation | Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char | P0 |
| PROD-001.4 | Implement password confirmation matching | Both password fields must match, real-time validation | P0 |
| PROD-001.5 | Create User entity in database | Prisma schema with all required fields, proper indexes | P0 |
| PROD-001.6 | Implement email uniqueness check | Return 409 Conflict if email exists | P0 |
| PROD-001.7 | Hash password before storage | Use bcrypt with cost factor 12 | P0 |
| PROD-001.8 | Generate email verification token | 64-char secure random token, 24-hour expiry | P0 |
| PROD-001.9 | Store verification token | EmailVerificationToken entity with userId, token, expiresAt | P0 |
| PROD-001.10 | Send verification email | Email contains verification link with token | P0 |
| PROD-001.11 | Create verify-email endpoint | POST /auth/verify-email validates token, activates user | P0 |
| PROD-001.12 | Handle expired tokens | Return 400 with "Token expired" message | P0 |
| PROD-001.13 | Implement resend verification | Rate-limited to 3 per hour | P1 |
| PROD-001.14 | Log registration events | Audit log for all registration attempts | P1 |

### PROD-002: Additional Info Collection

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-002.1 | Create profile completion form | Address, postalCode, city, country, phone fields | P0 |
| PROD-002.2 | Implement country dropdown | Populated from Countries table, searchable | P0 |
| PROD-002.3 | Implement city autocomplete | Filter cities by selected country | P0 |
| PROD-002.4 | Validate postal code format | Regex validation per country format | P1 |
| PROD-002.5 | Validate phone format | International format with country code (E.164) | P0 |
| PROD-002.6 | Update user profile endpoint | PATCH /auth/complete-profile | P0 |
| PROD-002.7 | Update user status | Change from PENDING_PROFILE to ACTIVE | P0 |
| PROD-002.8 | Block access until complete | Middleware redirects incomplete profiles | P0 |

### PROD-003: Welcome Email

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-003.1 | Create welcome email template | Handlebars template with user name, platform intro | P0 |
| PROD-003.2 | Trigger email on profile completion | Sent after PROD-002.7 completes | P0 |
| PROD-003.3 | Include getting started links | Links to create listing, browse, invite friends | P1 |
| PROD-003.4 | Track email delivery status | Log success/failure in database | P1 |

### PROD-004: User Types

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-004.1 | Define UserRole enum | USER, ADMIN values in Prisma schema | P0 |
| PROD-004.2 | Implement RolesGuard | NestJS guard checking user.role | P0 |
| PROD-004.3 | Create @Roles decorator | Decorator for controller methods | P0 |
| PROD-004.4 | Default new users to USER role | Registration sets role = USER | P0 |
| PROD-004.5 | Admin role assignment endpoint | POST /users/:id/role (Admin only) | P0 |
| PROD-004.6 | Prevent self-role modification | Users cannot change own role | P0 |

### PROD-005: User Entities

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-005.1 | Create User model fields | email, firstName, lastName, phone, address, postalCode, city, country | P0 |
| PROD-005.2 | Create SocialProfile model | platform (enum), url, userId foreign key | P0 |
| PROD-005.3 | GET /users/:id endpoint | Return user profile (self or admin) | P0 |
| PROD-005.4 | PATCH /users/:id endpoint | Update profile fields (self or admin) | P0 |
| PROD-005.5 | GET /users/:id/social-profiles | Return array of social profiles | P0 |
| PROD-005.6 | PUT /users/:id/social-profiles | Replace all social profiles | P0 |
| PROD-005.7 | Implement profile visibility | Public profile shows limited fields | P1 |

### PROD-006: User Invitation System

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-006.1 | Create Invitation model | email, inviterId, token, status, expiresAt, kickbackEligible | P0 |
| PROD-006.2 | POST /invitations endpoint | Create and send invitation email | P0 |
| PROD-006.3 | Validate invitee not existing | Return 409 if email already registered | P0 |
| PROD-006.4 | Validate not self-invite | Return 400 if inviting own email | P0 |
| PROD-006.5 | Check duplicate pending invite | Return 409 if active invite exists | P0 |
| PROD-006.6 | Generate invitation token | 64-char secure token, 7-day expiry | P0 |
| PROD-006.7 | Send invitation email | Template with inviter name, accept link | P0 |
| PROD-006.8 | GET /invitations endpoint | List user's sent invitations | P0 |
| PROD-006.9 | DELETE /invitations/:id | Cancel pending invitation | P0 |
| PROD-006.10 | Accept invitation flow | Register with invitation token, link inviter | P0 |
| PROD-006.11 | Set kickbackEligible flag | True when invitee completes registration | P0 |
| PROD-006.12 | Track invitation status | PENDING, ACCEPTED, EXPIRED, CANCELLED enum | P0 |
| PROD-006.13 | POST /invitations/:id/resend | Resend with new token, extend expiry | P1 |
| PROD-006.14 | Invitation statistics endpoint | GET /invitations/stats - counts by status | P1 |

### PROD-007: Invitation Tracking

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-007.1 | Add invitedById to User model | Foreign key to inviting user | P0 |
| PROD-007.2 | Store inviter on registration | Set when accepting invitation | P0 |
| PROD-007.3 | GET /users/:id/invitation-network | Return upstream chain (who invited whom) | P0 |
| PROD-007.4 | Calculate network depth | Recursive query up to root user | P0 |
| PROD-007.5 | GET /users/:id/direct-invitees | List users directly invited | P1 |
| PROD-007.6 | Network visualization data | JSON structure for tree visualization | P2 |

### PROD-008: ID Verification

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-008.1 | Create VerificationRequest model | userId, documentType, status, submittedAt | P1 |
| PROD-008.2 | POST /verification/identity | Submit ID document images | P1 |
| PROD-008.3 | Document type enum | PASSPORT, DRIVERS_LICENSE, NATIONAL_ID | P1 |
| PROD-008.4 | Store document securely | Encrypted storage, S3 with restricted access | P1 |
| PROD-008.5 | Admin verification queue | GET /admin/verifications/pending | P1 |
| PROD-008.6 | Approve/reject endpoint | PATCH /admin/verifications/:id | P1 |
| PROD-008.7 | Update user verified status | Set isIdentityVerified = true on approval | P1 |
| PROD-008.8 | Send verification result email | Notify user of approval/rejection | P1 |
| PROD-008.9 | Integrate verification provider | Onfido, Jumio, or similar API (future) | P2 |

### PROD-009: Background Checks

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-009.1 | Create BackgroundCheck model | userId, type, status, reportUrl, expiresAt | P2 |
| PROD-009.2 | POST /verification/background-check | Request background check | P2 |
| PROD-009.3 | Integrate provider API | Checkr, Sterling, or similar | P2 |
| PROD-009.4 | Store check results securely | Encrypted, time-limited access | P2 |
| PROD-009.5 | Background check consent flow | User must agree to terms | P2 |

### PROD-010: Verified Badges

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-010.1 | Add verification flags to User | isIdentityVerified, isBackgroundChecked | P1 |
| PROD-010.2 | Display verified badge on profile | Visual badge icon for verified users | P1 |
| PROD-010.3 | Filter by verified status | Search filter for verified sellers/hosts | P1 |
| PROD-010.4 | Badge tooltip explanation | Hover shows verification details | P2 |

### PROD-011: Biometric Authentication

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-011.1 | Integrate device biometrics | iOS Face ID/Touch ID, Android fingerprint | P2 |
| PROD-011.2 | Biometric enrollment flow | User opts in via settings | P2 |
| PROD-011.3 | Store biometric preference | biometricEnabled flag on User | P2 |
| PROD-011.4 | Fallback to password | Always allow password auth | P2 |
| PROD-011.5 | Biometric for sensitive actions | Require for payments, profile changes | P2 |

---

## 2. Property Listings

### PROD-020: Property Entities

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-020.1 | Create Property model | All required fields in Prisma schema | P0 |
| PROD-020.2 | Address field validation | Required, string, max 500 chars | P0 |
| PROD-020.3 | Postal code validation | Regex per country format | P0 |
| PROD-020.4 | City validation against country | Must exist in country's city list | P0 |
| PROD-020.5 | Country validation | Must exist in Countries table | P0 |
| PROD-020.6 | Geocode address | Store latitude/longitude from address | P0 |
| PROD-020.7 | Create PropertyAddress embedded | Structured address components | P1 |

### PROD-021: Create Offer

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-021.1 | POST /properties endpoint | Create property listing | P0 |
| PROD-021.2 | Property dimensions fields | bedrooms, bathrooms, squareMeters, lotSize | P0 |
| PROD-021.3 | Characteristics as JSON | Flexible key-value for property features | P0 |
| PROD-021.4 | Base price field | Decimal with currency code | P0 |
| PROD-021.5 | Negotiability range | minPrice, maxPrice, isNegotiable | P0 |
| PROD-021.6 | Dynamic pricing settings | Link to DynamicPricingRule model | P0 |
| PROD-021.7 | Availability calendar | Link to AvailabilitySlot model | P0 |
| PROD-021.8 | Inspection calendar | Link to InspectionSlot model | P0 |
| PROD-021.9 | Assign owner | Set ownerId to current user | P0 |
| PROD-021.10 | Set initial status | DRAFT status on creation | P0 |
| PROD-021.11 | PATCH /properties/:id | Update property details | P0 |
| PROD-021.12 | DELETE /properties/:id | Soft delete (set deletedAt) | P0 |

### PROD-022: Listing Types

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-022.1 | Create ListingType enum | FOR_SALE, SHORT_TERM_RENT, LONG_TERM_RENT, FOR_EVENTS, FOR_BARTER | P0 |
| PROD-022.2 | Multi-select field | Array of ListingType on Property | P0 |
| PROD-022.3 | At least one required | Validation requires minimum 1 type | P0 |
| PROD-022.4 | Type-specific pricing | Different base prices per listing type | P1 |
| PROD-022.5 | Filter by listing type | Search filter for specific types | P0 |

### PROD-023: Dynamic Pricing

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-023.1 | Create DynamicPricingRule model | propertyId, name, ruleType, conditions, multiplier | P0 |
| PROD-023.2 | Rule types enum | WEEKEND, HOLIDAY, SEASONAL, LAST_MINUTE, LENGTH_OF_STAY | P0 |
| PROD-023.3 | Weekend pricing rule | Apply multiplier for Fri-Sun | P0 |
| PROD-023.4 | Holiday pricing rule | Specify date ranges with multipliers | P0 |
| PROD-023.5 | Seasonal pricing rule | Date range with multiplier (e.g., summer +20%) | P0 |
| PROD-023.6 | Last-minute discount | Days before check-in with discount | P1 |
| PROD-023.7 | Length of stay discount | Discount for 7+, 30+ day stays | P1 |
| PROD-023.8 | POST /properties/:id/pricing/rules | Create pricing rule | P0 |
| PROD-023.9 | GET /properties/:id/pricing/rules | List all rules | P0 |
| PROD-023.10 | Calculate effective price | Apply all matching rules to base price | P0 |
| PROD-023.11 | Rule priority/ordering | Apply rules in defined order | P1 |

### PROD-024: Availability Calendar

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-024.1 | Create AvailabilitySlot model | propertyId, startDate, endDate, isAvailable, priceOverride | P0 |
| PROD-024.2 | POST /properties/:id/availability | Create availability slot | P0 |
| PROD-024.3 | GET /properties/:id/availability | Get slots with date range filter | P0 |
| PROD-024.4 | Bulk slot creation | Create multiple slots at once | P0 |
| PROD-024.5 | Overlap detection | Prevent overlapping date ranges | P0 |
| PROD-024.6 | Calendar UI component | Visual month calendar view | P0 |
| PROD-024.7 | Date range selection | From-to date picker | P0 |
| PROD-024.8 | Calculate period cost | Sum daily costs for selected range | P0 |
| PROD-024.9 | Display calculated cost | Show total before booking | P0 |
| PROD-024.10 | Block dates on booking | Mark as unavailable when booked | P0 |

### PROD-025: Inspection Scheduling

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-025.1 | Create InspectionSlot model | propertyId, date, startTime, endTime, isBooked, bookedById | P0 |
| PROD-025.2 | POST /properties/:id/inspections | Create inspection slot | P0 |
| PROD-025.3 | GET /properties/:id/inspections | Get available slots | P0 |
| PROD-025.4 | Time slot format | 30-minute or 1-hour slots | P0 |
| PROD-025.5 | Bulk slot creation | Create recurring weekly slots | P1 |
| PROD-025.6 | POST /properties/:id/inspections/:slotId/book | Book a slot | P0 |
| PROD-025.7 | Booking confirmation email | Send to both parties | P0 |
| PROD-025.8 | Cancel booking | DELETE cancels and notifies | P0 |
| PROD-025.9 | Inspection reminders | Email 24h and 1h before | P1 |

### PROD-026: No Agents Tag

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-026.1 | Add noAgents boolean to Property | Default false | P1 |
| PROD-026.2 | Toggle in listing form | Checkbox for "No agents" | P1 |
| PROD-026.3 | Filter from agent searches | Exclude when user.role = AGENT | P1 |
| PROD-026.4 | Display tag on listing | Visual indicator for no agents | P1 |

### PROD-027: Property Details

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-027.1 | Energy efficiency field | Rating enum (A+, A, B, C, D, E, F, G) | P0 |
| PROD-027.2 | Energy certificate URL | Link to uploaded certificate | P1 |
| PROD-027.3 | Create FloorPlan model | propertyId, name, imageUrl, floor | P0 |
| PROD-027.4 | Multiple floor plans | Array of floor plans per property | P0 |
| PROD-027.5 | Property boundaries | GeoJSON polygon for lot shape | P2 |
| PROD-027.6 | HOA information fields | hasHOA, hoaFeeMonthly, hoaRules | P1 |
| PROD-027.7 | Property tax history | Array of year/amount records | P1 |
| PROD-027.8 | Utilities costs history | Monthly averages by utility type | P1 |

### PROD-028: Media Support

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-028.1 | Create PropertyMedia model | propertyId, type, url, isPrimary, sortOrder | P0 |
| PROD-028.2 | Media type enum | IMAGE, VIDEO, TOUR_360, TOUR_3D | P0 |
| PROD-028.3 | POST /properties/:id/media | Upload media files | P0 |
| PROD-028.4 | S3 storage for media | Signed URLs, CDN delivery | P0 |
| PROD-028.5 | Image optimization | Resize, compress, generate thumbnails | P0 |
| PROD-028.6 | Video transcoding | Multiple resolutions, streaming format | P1 |
| PROD-028.7 | 360° tour viewer | Pannellum or similar integration | P1 |
| PROD-028.8 | 3D tour embed | Matterport or similar integration | P2 |
| PROD-028.9 | Street view integration | Google Street View embed | P1 |
| PROD-028.10 | Reorder media | PUT /properties/:id/media/order | P0 |
| PROD-028.11 | Set primary media | PATCH /properties/:id/media/:mediaId/primary | P0 |
| PROD-028.12 | Photo verification badge | Mark professionally verified photos | P2 |

### PROD-029: AI Description Generation

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-029.1 | POST /properties/:id/ai/description | Generate description | P1 |
| PROD-029.2 | Tone selection parameter | LUXURY, FAMILY_FRIENDLY, INVESTMENT_FOCUSED | P1 |
| PROD-029.3 | Property data as context | Send all property details to LLM | P1 |
| PROD-029.4 | Return generated text | Stream or return complete description | P1 |
| PROD-029.5 | Edit before saving | User can modify generated text | P1 |
| PROD-029.6 | Save to description field | Store final description on Property | P1 |
| PROD-029.7 | Regenerate option | Allow multiple generations | P1 |
| PROD-029.8 | Usage tracking | Track AI generation usage per user | P2 |

### PROD-030: Virtual Staging

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-030.1 | POST /properties/:id/ai/staging | Submit room photo | P2 |
| PROD-030.2 | Room type parameter | LIVING_ROOM, BEDROOM, KITCHEN, etc. | P2 |
| PROD-030.3 | Style parameter | MODERN, TRADITIONAL, MINIMALIST, etc. | P2 |
| PROD-030.4 | AI staging provider | Integration with staging API | P2 |
| PROD-030.5 | Return staged image | Store as additional media | P2 |
| PROD-030.6 | Mark as virtually staged | Badge on staged images | P2 |

### PROD-031: Time-of-Day Photos

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-031.1 | Time-of-day tag on media | DAWN, NOON, DUSK, NIGHT enum | P2 |
| PROD-031.2 | Seasonal tag on media | SPRING, SUMMER, FALL, WINTER enum | P2 |
| PROD-031.3 | Photo slider component | UI to switch between times/seasons | P2 |
| PROD-031.4 | Group photos by tag | Same angle, different times | P2 |

---

## 3. Search & Discovery

### PROD-040: Search Agents

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-040.1 | Create SearchAgent model | userId, name, criteria (JSON), isActive | P0 |
| PROD-040.2 | POST /search-agents | Create saved search | P0 |
| PROD-040.3 | Criteria structure | listingTypes, location, priceRange, characteristics | P0 |
| PROD-040.4 | GET /search-agents | List user's search agents | P0 |
| PROD-040.5 | PATCH /search-agents/:id | Update search criteria | P0 |
| PROD-040.6 | DELETE /search-agents/:id | Remove search agent | P0 |
| PROD-040.7 | Toggle active status | Enable/disable notifications | P0 |
| PROD-040.8 | Schedule matching job | Cron job to check for matches | P1 |
| PROD-040.9 | Match new listings | Compare new properties to criteria | P1 |
| PROD-040.10 | Avoid duplicate notifications | Track notified property IDs | P1 |

### PROD-041: Search Agent Notifications

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-041.1 | Create notification on match | Notification model with searchAgentId | P1 |
| PROD-041.2 | Email notification | Send email with matching properties | P1 |
| PROD-041.3 | In-app notification | Create Notification record | P1 |
| PROD-041.4 | Push notification | Mobile push for new matches | P2 |
| PROD-041.5 | Notification frequency setting | INSTANT, DAILY_DIGEST, WEEKLY_DIGEST | P1 |
| PROD-041.6 | Digest email template | Compile multiple matches into one email | P1 |
| PROD-041.7 | Unsubscribe link | One-click disable notifications | P1 |

### PROD-042: Advanced Filters

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-042.1 | Country filter | Dropdown with all countries | P0 |
| PROD-042.2 | Pet-friendly filter | Boolean filter | P0 |
| PROD-042.3 | Newly built filter | Properties < 5 years old | P1 |
| PROD-042.4 | Energy efficiency filter | Minimum rating (A+, A, B, etc.) | P1 |
| PROD-042.5 | HOA fees filter | Max monthly fee, or no HOA | P1 |
| PROD-042.6 | Property age filter | Min/max years | P1 |
| PROD-042.7 | Lot size filter | Min/max square meters | P0 |
| PROD-042.8 | Accessibility filter | Wheelchair accessible, etc. | P1 |
| PROD-042.9 | Price range filter | Min/max price | P0 |
| PROD-042.10 | Bedrooms filter | Min/max bedrooms | P0 |
| PROD-042.11 | Bathrooms filter | Min/max bathrooms | P0 |
| PROD-042.12 | Square meters filter | Min/max area | P0 |
| PROD-042.13 | Apply filters to query | Build Prisma where clause | P0 |

### PROD-043: Map-Based Search

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-043.1 | Map component | Google Maps or Mapbox integration | P0 |
| PROD-043.2 | Display property markers | Cluster markers at zoom levels | P0 |
| PROD-043.3 | Marker click shows preview | Property card on marker click | P0 |
| PROD-043.4 | Draw custom search area | Freehand polygon drawing tool | P1 |
| PROD-043.5 | Polygon search | Filter properties within drawn area | P1 |
| PROD-043.6 | Viewport search | Search within visible map bounds | P0 |
| PROD-043.7 | Commute time filter | Input destination, max time | P2 |
| PROD-043.8 | Isochrone visualization | Show reachable area on map | P2 |
| PROD-043.9 | Save drawn areas | Store polygons with search agents | P2 |

### PROD-044: Voice Search

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-044.1 | Voice input button | Microphone icon in search | P2 |
| PROD-044.2 | Speech-to-text | Browser Web Speech API | P2 |
| PROD-044.3 | NLP parsing | Extract search criteria from speech | P2 |
| PROD-044.4 | Confirm parsed criteria | Show interpreted search before executing | P2 |

### PROD-045: Visual Search

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-045.1 | Image upload in search | Drag/drop or file picker | P3 |
| PROD-045.2 | Image embedding | Generate embedding vector | P3 |
| PROD-045.3 | Similarity search | Find visually similar properties | P3 |
| PROD-045.4 | Display similar results | Ranked by similarity score | P3 |

### PROD-046: AR Property Discovery

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-046.1 | AR camera view | Mobile app AR mode | P3 |
| PROD-046.2 | Overlay property markers | Show available properties in view | P3 |
| PROD-046.3 | Distance and direction | AR labels with distance | P3 |
| PROD-046.4 | Tap for details | Open property card from AR | P3 |

### PROD-047: Lifestyle Matching

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-047.1 | User interests profile | Hobbies, lifestyle preferences | P2 |
| PROD-047.2 | Property lifestyle tags | Near hiking, nightlife, schools, etc. | P2 |
| PROD-047.3 | Lifestyle score calculation | Match interests to property tags | P2 |
| PROD-047.4 | Lifestyle-based recommendations | AI suggestions based on interests | P2 |

### PROD-048: Open House Filtering

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-048.1 | Open house date field | Scheduled open house events | P1 |
| PROD-048.2 | Filter by open house date | Show properties with upcoming events | P1 |
| PROD-048.3 | Open house calendar view | See all open houses on calendar | P1 |
| PROD-048.4 | Open house reminders | Notify user of saved open houses | P2 |

### PROD-049: Saved Searches (Favorites)

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-049.1 | Create FavoriteProperty model | userId, propertyId, createdAt | P0 |
| PROD-049.2 | POST /favorites/:propertyId | Add to favorites | P0 |
| PROD-049.3 | DELETE /favorites/:propertyId | Remove from favorites | P0 |
| PROD-049.4 | GET /favorites | List user's favorites | P0 |
| PROD-049.5 | Heart icon on listings | Toggle favorite status | P0 |
| PROD-049.6 | Price change alerts | Notify when favorited property price changes | P1 |
| PROD-049.7 | Status change alerts | Notify when property status changes | P1 |

### PROD-050: AI Recommendations

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-050.1 | Create BrowsingHistory model | userId, propertyId, viewedAt, duration | P1 |
| PROD-050.2 | Track property views | Log when user views property | P1 |
| PROD-050.3 | Analyze browsing patterns | Extract preferences from history | P2 |
| PROD-050.4 | Combine data sources | History + favorites + search agents | P2 |
| PROD-050.5 | Generate recommendations | AI-powered property suggestions | P2 |
| PROD-050.6 | GET /recommendations | Return personalized list | P2 |
| PROD-050.7 | Recommendation explanation | "Because you viewed..." text | P2 |
| PROD-050.8 | Feedback on recommendations | Thumbs up/down to improve | P2 |

---

## 4. Service Providers

### PROD-060: Service Provider Application

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-060.1 | Create ServiceProvider model | userId, serviceType, status, details | P1 |
| PROD-060.2 | ServiceType enum | LAWYER, CLEANER, HANDYMAN, PROPERTY_SHOWING, RECEPTIONIST | P1 |
| PROD-060.3 | POST /service-providers/apply | Submit application | P1 |
| PROD-060.4 | Application form | Service type, experience, qualifications | P1 |
| PROD-060.5 | Supporting documents | Upload certifications, licenses | P1 |
| PROD-060.6 | Application status | PENDING, APPROVED, REJECTED enum | P1 |
| PROD-060.7 | Email on submission | Confirm application received | P1 |

### PROD-061: Service Provider Profiles

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-061.1 | One active service type | Only one type active at a time | P1 |
| PROD-061.2 | Multiple service profiles | User can have multiple types | P1 |
| PROD-061.3 | Service details JSON | Flexible field structure per type | P1 |
| PROD-061.4 | Profile completeness score | Percentage of fields filled | P2 |
| PROD-061.5 | Service area coverage | Geographic area served | P1 |

### PROD-062: Availability Calendar

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-062.1 | Create ProviderAvailability model | providerId, dayOfWeek, startTime, endTime | P1 |
| PROD-062.2 | Weekly schedule setup | Set regular hours per day | P1 |
| PROD-062.3 | Exception dates | Mark specific dates unavailable | P1 |
| PROD-062.4 | Hourly slot view | Visual calendar with time slots | P1 |
| PROD-062.5 | Real-time availability | Check against existing bookings | P1 |

### PROD-063: Job Matching

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-063.1 | Create JobOffer model | propertyId, serviceType, requesterId, providerId, status | P1 |
| PROD-063.2 | Match providers to requests | Find available providers by type/area | P1 |
| PROD-063.3 | Push job notifications | Notify matching providers | P1 |
| PROD-063.4 | Job offer list | GET /service-providers/jobs | P1 |

### PROD-064: Offer Handling

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-064.1 | Accept job offer | PATCH /jobs/:id/accept | P1 |
| PROD-064.2 | Reject job offer | PATCH /jobs/:id/reject | P1 |
| PROD-064.3 | Negotiate terms | Counter-offer flow | P2 |
| PROD-064.4 | Job status tracking | PENDING, ACCEPTED, IN_PROGRESS, COMPLETED | P1 |

### PROD-065: Service Provider Search

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-065.1 | GET /service-providers | List with filters | P1 |
| PROD-065.2 | Filter by service type | Dropdown selection | P1 |
| PROD-065.3 | Filter by location | Within radius of property | P1 |
| PROD-065.4 | Filter by availability | Available on specific date/time | P1 |
| PROD-065.5 | Filter by rating | Minimum rating threshold | P1 |

### PROD-066: Admin Approval

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-066.1 | GET /admin/service-providers/pending | List pending applications | P1 |
| PROD-066.2 | PATCH /admin/service-providers/:id/approve | Approve application | P1 |
| PROD-066.3 | PATCH /admin/service-providers/:id/reject | Reject with reason | P1 |
| PROD-066.4 | DELETE /admin/service-providers/:id | Remove provider | P1 |
| PROD-066.5 | Email on approval/rejection | Notify provider of decision | P1 |
| PROD-066.6 | In-app notification | Create notification record | P1 |

### PROD-067: Service Provider Listing

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-067.1 | Public provider list | Only APPROVED and ACTIVE | P1 |
| PROD-067.2 | Provider profile page | Detailed view with reviews | P1 |
| PROD-067.3 | Availability display | Show weekly schedule | P1 |
| PROD-067.4 | Contact options | Message, call buttons | P1 |
| PROD-067.5 | Request service button | Initiate job offer flow | P1 |

### PROD-068: Rating System

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-068.1 | Create ProviderReview model | providerId, reviewerId, rating, text, jobId | P1 |
| PROD-068.2 | POST /service-providers/:id/reviews | Submit review | P1 |
| PROD-068.3 | Rating 1-5 stars | Required numeric rating | P1 |
| PROD-068.4 | Written review optional | Text field for feedback | P1 |
| PROD-068.5 | Only after completed job | Validate job completion | P1 |
| PROD-068.6 | Calculate average rating | Update on new review | P1 |
| PROD-068.7 | Display on profile | Show average and count | P1 |
| PROD-068.8 | Sort by rating | Search results ordering | P1 |

---

## 5. Insurance & Mortgage

### PROD-080: Platform Services

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-080.1 | Insurance service page | /insurance route | P2 |
| PROD-080.2 | Mortgage service page | /mortgage route | P2 |
| PROD-080.3 | Distinguish from providers | Separate UI section | P2 |
| PROD-080.4 | Platform branding | Presented as 12done services | P2 |

### PROD-081: Provider Applications

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-081.1 | InsuranceProvider model | Company details, license, contact | P2 |
| PROD-081.2 | MortgageProvider model | Company details, license, contact | P2 |
| PROD-081.3 | /become-insurance-provider page | Application form | P2 |
| PROD-081.4 | /become-mortgage-provider page | Application form | P2 |
| PROD-081.5 | Admin approval workflow | Same as service providers | P2 |

### PROD-082: Provider Profiles

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-082.1 | Insurance provider detail page | Company info, services | P2 |
| PROD-082.2 | Mortgage provider detail page | Company info, products | P2 |
| PROD-082.3 | Contact functionality | Inquiry form | P2 |
| PROD-082.4 | Response tracking | Track provider responses | P2 |

### PROD-083: Mortgage Calculator

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-083.1 | Calculator component | Input: price, down payment, rate, term | P1 |
| PROD-083.2 | Monthly payment calculation | Principal + interest formula | P1 |
| PROD-083.3 | Display on property page | Embedded calculator | P1 |
| PROD-083.4 | Amortization schedule | Full payment breakdown table | P2 |
| PROD-083.5 | Connect to mortgage providers | CTA to request quotes | P2 |

---

## 6. Negotiations & Transactions

### PROD-090: In-App Negotiations

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-090.1 | Create Negotiation model | propertyId, buyerId, sellerId, type, status | P1 |
| PROD-090.2 | Negotiation types enum | BUY, SELL, RENT | P1 |
| PROD-090.3 | POST /negotiations | Initiate negotiation | P1 |
| PROD-090.4 | Create Offer model | negotiationId, amount, terms, status | P1 |
| PROD-090.5 | POST /negotiations/:id/offers | Submit offer | P1 |
| PROD-090.6 | Counter-offer flow | Reject with new terms | P1 |
| PROD-090.7 | Accept offer | PATCH /negotiations/:id/accept | P1 |
| PROD-090.8 | Negotiation history | Track all offers in order | P1 |

### PROD-091: Negotiation Categories

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-091.1 | Negotiations page | /negotiations route | P1 |
| PROD-091.2 | Tab filtering | Buying, Selling, Renting tabs | P1 |
| PROD-091.3 | Status filters | Active, Pending, Completed | P1 |
| PROD-091.4 | Sortable list | By date, price, status | P1 |

### PROD-092: Offer Display

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-092.1 | Offer modal | UI for making offers | P1 |
| PROD-092.2 | Display current price | Show property price in modal | P1 |
| PROD-092.3 | Display calculated cost | For rentals: total for period | P1 |
| PROD-092.4 | Fee breakdown preview | Show service fees | P1 |

### PROD-093: Payment Processing

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-093.1 | Create Transaction model | negotiationId, amount, status, stripeId | P1 |
| PROD-093.2 | Stripe checkout session | Create on accepted offer | P1 |
| PROD-093.3 | Payment confirmation | Handle webhook success | P1 |
| PROD-093.4 | Payment failure handling | Handle webhook failure | P1 |
| PROD-093.5 | Service provider payments | Pay for completed jobs | P1 |
| PROD-093.6 | Rental payments | Recurring payment setup | P2 |

### PROD-094: Stripe Integration

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-094.1 | Stripe SDK setup | stripe npm package | P1 |
| PROD-094.2 | API keys configuration | Test and live keys in env | P1 |
| PROD-094.3 | Checkout session creation | Stripe.checkout.sessions.create | P1 |
| PROD-094.4 | Webhook endpoint | POST /stripe/webhook | P1 |
| PROD-094.5 | Invoice generation | Stripe Invoicing API | P1 |
| PROD-094.6 | Connect for payouts | Stripe Connect for sellers | P2 |

### PROD-095: Transaction Tracking

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-095.1 | Log all transactions | Complete audit trail | P0 |
| PROD-095.2 | Transaction details | Amount, parties, property, date | P0 |
| PROD-095.3 | Platform fee calculation | Calculate percentage | P0 |
| PROD-095.4 | Profit share calculation | Apply BIZ-003 formula | P1 |
| PROD-095.5 | Transaction reports | Admin export functionality | P1 |

### PROD-096: Split Payments

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-096.1 | Split payment option | UI for multiple payers | P2 |
| PROD-096.2 | Roommate split | Divide rent among tenants | P2 |
| PROD-096.3 | Individual payment links | Each payer gets link | P2 |
| PROD-096.4 | Track partial payments | Status per participant | P2 |

### PROD-097: Escrow Services

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-097.1 | Escrow provider integration | Third-party escrow API | P2 |
| PROD-097.2 | Escrow threshold | Require for transactions > X | P2 |
| PROD-097.3 | Escrow status tracking | Pending, Released, Disputed | P2 |
| PROD-097.4 | Release conditions | Defined milestones | P2 |

---

## 7. Property Management

### PROD-100: Management Dashboard

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-100.1 | Landlord dashboard page | /dashboard/landlord | P1 |
| PROD-100.2 | Listings overview | All properties with status | P1 |
| PROD-100.3 | Rental income tracker | Monthly income chart | P1 |
| PROD-100.4 | Expense tracker | Add/edit expenses | P1 |
| PROD-100.5 | Net income calculation | Income - expenses | P1 |
| PROD-100.6 | Maintenance requests list | Pending/resolved status | P1 |
| PROD-100.7 | Tenant communication | Quick access to messages | P1 |

### PROD-101: Favorites & Applications

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-101.1 | Saved properties page | /favorites | P0 |
| PROD-101.2 | Create RentalApplication model | propertyId, applicantId, status | P1 |
| PROD-101.3 | POST /properties/:id/apply | Submit application | P1 |
| PROD-101.4 | GET /applications | List user's applications | P1 |
| PROD-101.5 | Application status tracking | PENDING, APPROVED, REJECTED | P1 |
| PROD-101.6 | Application details | Income, references, etc. | P1 |

### PROD-102: Rent Reminders

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-102.1 | Create Lease model | propertyId, tenantId, startDate, endDate, rentAmount, dueDay | P1 |
| PROD-102.2 | Rent due date tracking | Day of month due | P1 |
| PROD-102.3 | Tenant reminder email | Send 5 days before due | P1 |
| PROD-102.4 | Landlord notification | Notify on payment | P1 |
| PROD-102.5 | Overdue notifications | Alert both parties | P1 |
| PROD-102.6 | In-app reminders | Notification + badge | P1 |

### PROD-103: Maintenance Workflows

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-103.1 | Create MaintenanceRequest model | propertyId, tenantId, type, description, status | P1 |
| PROD-103.2 | POST /maintenance-requests | Submit request | P1 |
| PROD-103.3 | Request types enum | PLUMBING, ELECTRICAL, HVAC, etc. | P1 |
| PROD-103.4 | Status workflow | SUBMITTED, APPROVED, SCHEDULED, COMPLETED | P1 |
| PROD-103.5 | Landlord approval step | Approve/reject requests | P1 |
| PROD-103.6 | Service provider assignment | Link to job offer | P1 |
| PROD-103.7 | Scheduling integration | Book maintenance slot | P1 |
| PROD-103.8 | Completion confirmation | Both parties confirm | P1 |

### PROD-104: Application Status

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-104.1 | Status change notification | Email on status update | P1 |
| PROD-104.2 | In-app notification | Create notification record | P1 |
| PROD-104.3 | Pending notification | "Application received" | P1 |
| PROD-104.4 | Approved notification | "Congratulations" email | P1 |
| PROD-104.5 | Rejected notification | "Unfortunately" email | P1 |

### PROD-105: Lease Renewal Automation

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-105.1 | Lease end date tracking | Monitor approaching ends | P1 |
| PROD-105.2 | Landlord reminder | Alert 60 days before end | P1 |
| PROD-105.3 | Renewal offer generation | Create renewal terms | P1 |
| PROD-105.4 | Tenant notification | Send renewal offer | P1 |
| PROD-105.5 | Term adjustment options | New rent, duration | P1 |
| PROD-105.6 | Accept/decline flow | Tenant response | P1 |
| PROD-105.7 | New lease generation | Auto-create on acceptance | P1 |

### PROD-106: Tenant Portal

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-106.1 | Tenant dashboard | /dashboard/tenant | P1 |
| PROD-106.2 | View lease details | Current lease information | P1 |
| PROD-106.3 | Make rent payment | Payment button/form | P1 |
| PROD-106.4 | Submit maintenance request | Request form | P1 |
| PROD-106.5 | Message landlord | Direct messaging | P1 |
| PROD-106.6 | E-sign lease | Integrated signing | P1 |
| PROD-106.7 | Document storage | Access lease, receipts | P1 |

### PROD-107: AI Maintenance Assistant

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-107.1 | Auto-categorize requests | AI determines type | P2 |
| PROD-107.2 | Priority scoring | Urgency assessment | P2 |
| PROD-107.3 | Suggested solutions | AI-generated fix suggestions | P2 |
| PROD-107.4 | Appointment suggestions | Optimal scheduling | P2 |

### PROD-108: Predictive Maintenance

| ID | Task | Acceptance Criteria | Priority |
|----|------|---------------------|----------|
| PROD-108.1 | Historical data analysis | Track past maintenance | P3 |
| PROD-108.2 | Failure prediction | AI predicts issues | P3 |
| PROD-108.3 | Proactive alerts | Warn before failure | P3 |
| PROD-108.4 | HVAC predictions | Based on age, history | P3 |

---

## 8-31. Additional Sections

*[Document continues with detailed breakdowns for sections 8-31, following the same format]*

---

## Implementation Phases

### Phase 1 - MVP (Current)
- PROD-001 through PROD-007 (User Management basics)
- PROD-020 through PROD-025 (Property Listings core)
- PROD-040 through PROD-043, PROD-049 (Search basics)
- PROD-090 through PROD-095 (Transactions core)
- NFR-001 through NFR-014 (Security/Performance)

### Phase 2 - Enhanced Features
- PROD-008 through PROD-011 (Verification)
- PROD-060 through PROD-068 (Service Providers)
- PROD-100 through PROD-106 (Property Management)
- PROD-200 through PROD-205 (Communication)

### Phase 3 - AI & Advanced
- PROD-029, PROD-030 (AI Content Generation)
- PROD-050 (AI Recommendations)
- PROD-107, PROD-108 (AI Maintenance)
- PROD-120 through PROD-133 (AI Tour Guide)
- PROD-160 through PROD-169 (Financial AI)
- PROD-224, PROD-225 (AI Legal)

### Phase 4 - Ecosystem
- PROD-044 through PROD-047 (Advanced Search)
- PROD-250 through PROD-254 (Smart Home)
- PROD-260 through PROD-264 (Moving)
- PROD-270 through PROD-274 (Social)
- PROD-320 through PROD-324 (Partnerships)

---

## Traceability Matrix

Each implementation task links back to its parent SRS requirement:

| SRS ID | Lower-Level IDs | Status |
|--------|-----------------|--------|
| PROD-001 | PROD-001.1 - PROD-001.14 | Implemented |
| PROD-002 | PROD-002.1 - PROD-002.8 | Implemented |
| PROD-003 | PROD-003.1 - PROD-003.4 | Implemented |
| PROD-004 | PROD-004.1 - PROD-004.6 | Implemented |
| PROD-005 | PROD-005.1 - PROD-005.7 | Implemented |
| PROD-006 | PROD-006.1 - PROD-006.14 | Implemented |
| PROD-007 | PROD-007.1 - PROD-007.6 | Implemented |
| PROD-020 | PROD-020.1 - PROD-020.7 | Implemented |
| PROD-021 | PROD-021.1 - PROD-021.12 | Implemented |
| PROD-022 | PROD-022.1 - PROD-022.5 | Implemented |
| PROD-023 | PROD-023.1 - PROD-023.11 | Implemented |
| PROD-024 | PROD-024.1 - PROD-024.10 | Implemented |
| PROD-025 | PROD-025.1 - PROD-025.9 | Implemented |
| PROD-040 | PROD-040.1 - PROD-040.10 | Implemented |
| PROD-041 | PROD-041.1 - PROD-041.7 | Partial |
| PROD-042 | PROD-042.1 - PROD-042.13 | Implemented |
| PROD-043 | PROD-043.1 - PROD-043.9 | Partial |
| PROD-049 | PROD-049.1 - PROD-049.7 | Implemented |
| ... | ... | ... |

---

## Appendix A: Priority Definitions

| Priority | Description |
|----------|-------------|
| P0 | Critical - Must have for MVP launch |
| P1 | High - Should have for MVP, can be fast-follow |
| P2 | Medium - Phase 2 feature |
| P3 | Low - Future enhancement |

---

*Document continues in subsequent files for sections 8-31...*
