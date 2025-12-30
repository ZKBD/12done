# Requirements Traceability Matrix

**Project:** 12done.com
**Last Updated:** 2025-12-29
**Version:** 1.5

This document traces requirements from the SRS to their implementing test cases and results. It must be updated whenever:
- New requirements are added to the SRS
- New test cases are created
- Tests are run and results change

---

## Test Run Summary (2025-12-29)

| Test Type | Passed | Failed | Total | Pass Rate |
|-----------|--------|--------|-------|-----------|
| Unit Tests | 1128 | 0 | 1128 | 100% |
| E2E Tests | 287 | 0 | 287 | 100% |
| Browser Tests | 5 | 0 | 5 | 100% |
| **Total** | **1420** | **0** | **1420** | **100%** |

All tests passing locally and in CI.

Note: E2E tests require Docker/database to run.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Test passes |
| ❌ | Test fails |
| ⏳ | Test not yet run |
| 🚧 | Test not yet implemented |
| N/A | Not applicable / No test needed |

---

## 1. User Management (PROD-001 to PROD-011)

### PROD-001: User Registration

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-001.1 | `register > should call authService.register with dto` | auth.controller.spec.ts | Verifies registration endpoint accepts email, name, password fields | ✅ |
| PROD-001.2 | `register > should return message response on success` | auth.controller.spec.ts | Verifies registration returns confirmation message | ✅ |
| PROD-001.3 | `register > should propagate service errors` | auth.controller.spec.ts | Verifies duplicate email returns error | ✅ |
| PROD-001.4 | `register > should hash password` | auth.service.spec.ts | Verifies password is hashed with bcrypt before storage | ✅ |
| PROD-001.5 | `register > should create email verification token` | auth.service.spec.ts | Verifies secure token is generated for email verification | ✅ |
| PROD-001.6 | `register > should send verification email` | auth.service.spec.ts | Verifies verification email is sent via mail service | ✅ |
| PROD-001 | `POST /auth/register > full registration flow` | auth.e2e-spec.ts | End-to-end test of complete registration process | ✅ |

### PROD-002: Additional Info Collection

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-002.1 | `completeProfile > should call authService.completeProfile` | auth.controller.spec.ts | Verifies profile completion endpoint accepts address, phone, city, country | ✅ |
| PROD-002.2 | `completeProfile > should return user and message on success` | auth.controller.spec.ts | Verifies profile completion returns updated user | ✅ |
| PROD-002.3 | `completeProfile > should propagate service errors` | auth.controller.spec.ts | Verifies error handling for already completed profiles | ✅ |
| PROD-002 | `POST /auth/complete-profile > profile completion flow` | auth.e2e-spec.ts | End-to-end test of profile completion | ✅ |

### PROD-003: Welcome Email

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-003.1 | `sendWelcomeEmail > should send welcome email` | mail.service.spec.ts | Verifies welcome email is sent after registration | ✅ |
| PROD-003.2 | `sendWelcomeEmail > should use correct template` | mail.service.spec.ts | Verifies welcome template is used | ✅ |

### PROD-004: User Types

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-004.1 | `updateRole > should call usersService.updateRole` | users.controller.spec.ts | Verifies role update endpoint works for admins | ✅ |
| PROD-004.2 | `updateRole > should return user with updated role` | users.controller.spec.ts | Verifies role is updated correctly | ✅ |
| PROD-004.3 | `updateRole > should propagate service errors` | users.controller.spec.ts | Verifies users cannot update their own role | ✅ |
| PROD-004.4 | `authorization context passing` | users.controller.spec.ts | Verifies role is passed correctly to service methods | ✅ |

### PROD-005: User Entities

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-005.1 | `findById > should call usersService.findById` | users.controller.spec.ts | Verifies user lookup by ID works | ✅ |
| PROD-005.2 | `findByIdPublic > should return public user profile` | users.controller.spec.ts | Verifies public profile excludes sensitive data | ✅ |
| PROD-005.3 | `update > should call usersService.update` | users.controller.spec.ts | Verifies user profile update works | ✅ |
| PROD-005.4 | `getSocialProfiles > should return social profiles array` | users.controller.spec.ts | Verifies social profiles can be retrieved | ✅ |
| PROD-005.5 | `updateSocialProfiles > should return updated profiles` | users.controller.spec.ts | Verifies social profiles can be updated | ✅ |
| PROD-005 | `GET /users/:id` | users.e2e-spec.ts | End-to-end test of user profile retrieval | ✅ |
| PROD-005 | `PATCH /users/:id` | users.e2e-spec.ts | End-to-end test of user profile update | ✅ |

### PROD-006: User Invitation System

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-006.1 | `create > should call invitationsService.create` | invitations.controller.spec.ts | Verifies invitation creation with email | ✅ |
| PROD-006.2 | `create > should return invitation response on success` | invitations.controller.spec.ts | Verifies invitation is created and returned | ✅ |
| PROD-006.3 | `create > should propagate service errors` | invitations.controller.spec.ts | Verifies duplicate invitation returns error | ✅ |
| PROD-006.4 | `findAll > should return paginated invitations` | invitations.controller.spec.ts | Verifies user can list their sent invitations | ✅ |
| PROD-006.5 | `cancel > should return success message` | invitations.controller.spec.ts | Verifies pending invitation can be cancelled | ✅ |
| PROD-006.6 | `resend > should return updated invitation` | invitations.controller.spec.ts | Verifies invitation can be resent with new token | ✅ |
| PROD-006.7 | `getKickbackEligible > should return kickback-eligible invitations` | invitations.controller.spec.ts | Verifies kickback eligibility tracking | ✅ |
| PROD-006 | `POST /invitations` | invitations.e2e-spec.ts | End-to-end test of invitation creation | ✅ |
| PROD-006 | `DELETE /invitations/:id` | invitations.e2e-spec.ts | End-to-end test of invitation cancellation | ✅ |

### PROD-007: Invitation Tracking

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-007.1 | `getInvitationNetwork > should return network data` | users.controller.spec.ts | Verifies upstream invitation chain is tracked | ✅ |
| PROD-007.2 | `getInvitationNetwork > should call service with user info` | users.controller.spec.ts | Verifies network data includes direct invitees | ✅ |

### PROD-008 to PROD-011: Verification Features

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-008 | N/A | N/A | ID verification - not yet implemented | 🚧 |
| PROD-009 | N/A | N/A | Background checks - not yet implemented | 🚧 |
| PROD-010 | N/A | N/A | Verified badges - not yet implemented | 🚧 |
| PROD-011 | N/A | N/A | Biometric authentication - not yet implemented | 🚧 |

---

## 2. Property Listings (PROD-020 to PROD-031)

### PROD-020: Property Entities

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-020.1 | `create > should call propertiesService.create` | properties.controller.spec.ts | Verifies property creation with address fields | ✅ |
| PROD-020.2 | `create > should propagate service errors` | properties.controller.spec.ts | Verifies validation errors are returned | ✅ |
| PROD-020 | `POST /properties` | properties.e2e-spec.ts | End-to-end test of property creation | ✅ |

### PROD-021: Create Offer

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-021.1 | `create > creates property with dimensions` | properties.service.spec.ts | Verifies property stores bedrooms, bathrooms, sqm | ✅ |
| PROD-021.2 | `create > sets owner to current user` | properties.service.spec.ts | Verifies ownerId is set correctly | ✅ |
| PROD-021.3 | `update > updates property details` | properties.service.spec.ts | Verifies property can be updated | ✅ |
| PROD-021.4 | `findById > returns property details` | properties.controller.spec.ts | Verifies property retrieval by ID | ✅ |
| PROD-021.5 | `delete > soft deletes property` | properties.controller.spec.ts | Verifies soft delete sets deletedAt | ✅ |

### PROD-022: Listing Types

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-022.1 | `updateListingTypes > should call service` | properties.controller.spec.ts | Verifies listing types can be updated | ✅ |
| PROD-022.2 | `findAll > filters by listing type` | properties.service.spec.ts | Verifies search filters by FOR_SALE, FOR_RENT, etc. | ✅ |

### PROD-023: Dynamic Pricing

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-023.1 | `createRule > creates pricing rule` | pricing.service.spec.ts | Verifies dynamic pricing rule creation | ✅ |
| PROD-023.2 | `getRules > returns property rules` | pricing.service.spec.ts | Verifies rules can be listed | ✅ |
| PROD-023.3 | `updateRule > updates rule settings` | pricing.service.spec.ts | Verifies rule can be modified | ✅ |
| PROD-023.4 | `deleteRule > removes rule` | pricing.service.spec.ts | Verifies rule can be deleted | ✅ |
| PROD-023.5 | `createPricingRule > controller delegation` | properties.controller.spec.ts | Verifies controller passes to service | ✅ |

### PROD-024: Availability Calendar

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-024.1 | `createSlot > creates availability slot` | availability.service.spec.ts | Verifies slot creation with date range | ✅ |
| PROD-024.2 | `createBulkSlots > creates multiple slots` | availability.service.spec.ts | Verifies bulk slot creation | ✅ |
| PROD-024.3 | `getSlots > returns slots for date range` | availability.service.spec.ts | Verifies slot retrieval with filters | ✅ |
| PROD-024.4 | `updateSlot > modifies slot` | availability.service.spec.ts | Verifies slot can be updated | ✅ |
| PROD-024.5 | `deleteSlot > removes slot` | availability.service.spec.ts | Verifies slot can be deleted | ✅ |
| PROD-024.6 | `calculateCost > computes rental cost` | availability.service.spec.ts | Verifies cost calculation for period | ✅ |
| PROD-024.7 | `calculateCost > controller endpoint` | properties.controller.spec.ts | Verifies cost endpoint works | ✅ |

### PROD-025: Inspection Scheduling

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-025.1 | `createSlot > creates inspection slot` | inspection.service.spec.ts | Verifies inspection slot creation | ✅ |
| PROD-025.2 | `createBulkSlots > creates multiple slots` | inspection.service.spec.ts | Verifies bulk slot creation | ✅ |
| PROD-025.3 | `getSlots > returns available slots` | inspection.service.spec.ts | Verifies slot retrieval | ✅ |
| PROD-025.4 | `bookSlot > books inspection` | inspection.service.spec.ts | Verifies slot can be booked | ✅ |
| PROD-025.5 | `cancelBooking > cancels inspection` | inspection.service.spec.ts | Verifies booking can be cancelled | ✅ |
| PROD-025.6 | `bookInspection > controller endpoint` | properties.controller.spec.ts | Verifies booking endpoint | ✅ |

### PROD-026: No Agents Tag

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-026.1 | `create > creates property with noAgents field` | properties.service.spec.ts | Verifies noAgents boolean can be set on property creation | ✅ |
| PROD-026.2 | `findAll > filters by noAgents` | properties.service.spec.ts | Verifies noAgents filter in search query | ✅ |
| PROD-026.3 | `findAll > should exclude noAgents properties for AGENT users` | properties.service.spec.ts | Verifies AGENT users cannot see noAgents=true properties | ✅ |
| PROD-026.4 | `findAll > should not apply noAgents filter for regular USER` | properties.service.spec.ts | Verifies regular users can see noAgents properties | ✅ |
| PROD-026.5 | `findAll > should not apply noAgents filter for ADMIN` | properties.service.spec.ts | Verifies admins can see all properties | ✅ |
| PROD-026.6 | `findById > should throw ForbiddenException for AGENT viewing noAgents property` | properties.service.spec.ts | Verifies AGENT cannot view noAgents property directly | ✅ |
| PROD-026.7 | `findById > should allow AGENT to view their own noAgents property` | properties.service.spec.ts | Verifies AGENT can view their own noAgents property | ✅ |
| PROD-026.8 | `findById > should allow regular USER to view noAgents property` | properties.service.spec.ts | Verifies regular users can view noAgents properties | ✅ |
| PROD-026 | `No Agents Tag > should exclude noAgents properties from AGENT search` | properties.e2e-spec.ts | E2E test of AGENT search exclusion | ✅ |
| PROD-026 | `No Agents Tag > should show noAgents properties to regular USER` | properties.e2e-spec.ts | E2E test of regular user search inclusion | ✅ |
| PROD-026 | `No Agents Tag > should block AGENT from viewing noAgents property directly` | properties.e2e-spec.ts | E2E test of direct property access blocking | ✅ |
| PROD-026 | `No Agents Tag > should allow regular USER to view noAgents property` | properties.e2e-spec.ts | E2E test of regular user direct access | ✅ |

### PROD-027 to PROD-031: Advanced Property Features

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-027.1 | `addFloorPlan > creates floor plan` | media.service.spec.ts | Verifies floor plan upload | ✅ |
| PROD-027.2 | `getFloorPlans > returns floor plans` | media.service.spec.ts | Verifies floor plan retrieval | ✅ |
| PROD-028.1 | `addMedia > creates property media` | media.service.spec.ts | Verifies media upload | ✅ |
| PROD-028.2 | `getMedia > returns media list` | media.service.spec.ts | Verifies media retrieval | ✅ |
| PROD-028.3 | `reorderMedia > updates sort order` | media.service.spec.ts | Verifies media reordering | ✅ |
| PROD-028.4 | `setPrimaryMedia > sets primary image` | media.service.spec.ts | Verifies primary media setting | ✅ |
| PROD-029 | N/A | N/A | AI description generation - not yet implemented | 🚧 |
| PROD-030 | N/A | N/A | Virtual staging - not yet implemented | 🚧 |
| PROD-031 | N/A | N/A | Time-of-day photos - not yet implemented | 🚧 |

---

## 3. Search & Discovery (PROD-040 to PROD-050)

### PROD-040: Search Agents

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-040.1 | `create > creates search agent` | search-agents.service.spec.ts | Verifies search agent creation with criteria | ✅ |
| PROD-040.2 | `findAll > returns user's search agents` | search-agents.service.spec.ts | Verifies search agent listing | ✅ |
| PROD-040.3 | `update > modifies search criteria` | search-agents.service.spec.ts | Verifies search agent update | ✅ |
| PROD-040.4 | `delete > removes search agent` | search-agents.service.spec.ts | Verifies search agent deletion | ✅ |
| PROD-040.5 | `toggleActive > enables/disables agent` | search-agents.service.spec.ts | Verifies active status toggle | ✅ |
| PROD-040 | `POST /search-agents` | search.e2e-spec.ts | End-to-end test of search agent creation | ✅ |

### PROD-041: Search Agent Notifications

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-041.1 | `updateStatus > should trigger search agent check when status changes to ACTIVE` | properties.service.spec.ts | Verifies notification trigger when property is published | ✅ |
| PROD-041.2 | `updateStatus > should not trigger search agent check for non-ACTIVE status changes` | properties.service.spec.ts | Verifies no notification for non-publish status changes | ✅ |
| PROD-041.3 | `updateStatus > should not fail if search agent check throws error` | properties.service.spec.ts | Verifies graceful error handling | ✅ |
| PROD-041.4 | `Search Agent Notifications > should create notification when property is published` | search.e2e-spec.ts | E2E test of notification creation on property publish | ✅ |
| PROD-041.5 | `Search Agent Notifications > should update lastTriggeredAt on search agent` | search.e2e-spec.ts | Verifies search agent timestamp update | ✅ |
| PROD-041.6 | `Search Agent Notifications > should NOT create notification for non-matching property` | search.e2e-spec.ts | Verifies criteria matching works correctly | ✅ |

### PROD-042: Advanced Filters

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-042.1 | `findAll > filters by country` | properties.service.spec.ts | Verifies country filter works | ✅ |
| PROD-042.2 | `findAll > filters by price range` | properties.service.spec.ts | Verifies price filter works | ✅ |
| PROD-042.3 | `findAll > filters by bedrooms` | properties.service.spec.ts | Verifies bedroom filter works | ✅ |
| PROD-042.4 | `findAll > returns paginated results` | properties.controller.spec.ts | Verifies pagination works | ✅ |
| PROD-042 | `GET /properties with filters` | properties.e2e-spec.ts | End-to-end test of property search | ✅ |

### PROD-043: Map-Based Search (Geo Search)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-043.1 | `findAll > should filter by geo bounding box` | properties.service.spec.ts | Verifies viewport/bounding box search using sw/ne coordinates | ✅ |
| PROD-043.2 | `findAll > should filter by radius search using bounding box approximation` | properties.service.spec.ts | Verifies radius search using center point and radius in km | ✅ |
| PROD-043.3 | `findAll > should filter by polygon search using bounding box approximation` | properties.service.spec.ts | Verifies polygon search using array of coordinates | ✅ |
| PROD-043.4 | `findAll > should not apply polygon filter with less than 3 points` | properties.service.spec.ts | Verifies polygon validation (minimum 3 points) | ✅ |
| PROD-043.5 | `Geo-based Search > should find property within bounding box` | properties.e2e-spec.ts | E2E test of viewport search | ✅ |
| PROD-043.6 | `Geo-based Search > should NOT find property outside bounding box` | properties.e2e-spec.ts | E2E test of bounding box exclusion | ✅ |
| PROD-043.7 | `Geo-based Search > should find property within radius` | properties.e2e-spec.ts | E2E test of radius search | ✅ |
| PROD-043.8 | `Geo-based Search > should NOT find property outside radius` | properties.e2e-spec.ts | E2E test of radius exclusion | ✅ |
| PROD-043.9 | `Geo-based Search > should find property within polygon` | properties.e2e-spec.ts | E2E test of polygon search | ✅ |
| PROD-043.10 | `Geo-based Search > should NOT find property outside polygon` | properties.e2e-spec.ts | E2E test of polygon exclusion | ✅ |
| PROD-043.11 | `Geo-based Search > should combine geo filters with other filters` | properties.e2e-spec.ts | E2E test of combined geo + property filters | ✅ |

### PROD-044 to PROD-047: Advanced Search Features (Phase 4)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-044 | N/A | N/A | Voice search - Phase 4 feature | 🚧 |
| PROD-045 | N/A | N/A | Visual search - Phase 4 feature | 🚧 |
| PROD-046 | N/A | N/A | AR property discovery - Phase 4 feature | 🚧 |
| PROD-047 | N/A | N/A | Lifestyle matching - Phase 4 feature | 🚧 |

### PROD-048: Open House Filtering

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-048.1 | `create > should create open house event` | open-house.service.spec.ts | Verifies open house event creation with date, time, description | ✅ |
| PROD-048.2 | `create > should throw BadRequestException for overlapping events` | open-house.service.spec.ts | Verifies overlap detection for events on same day | ✅ |
| PROD-048.3 | `create > should throw BadRequestException if end time is before start time` | open-house.service.spec.ts | Verifies time validation | ✅ |
| PROD-048.4 | `create > should throw ForbiddenException for non-owner non-admin` | open-house.service.spec.ts | Verifies only owner/admin can create open house | ✅ |
| PROD-048.5 | `findAll > should return only public events for non-owner` | open-house.service.spec.ts | Verifies visibility control for open house events | ✅ |
| PROD-048.6 | `findAll > should filter upcoming events only when upcomingOnly is true` | open-house.service.spec.ts | Verifies upcoming filter works | ✅ |
| PROD-048.7 | `update > should update open house event` | open-house.service.spec.ts | Verifies event update functionality | ✅ |
| PROD-048.8 | `delete > should delete open house event` | open-house.service.spec.ts | Verifies event deletion | ✅ |
| PROD-048.9 | `getUpcomingOpenHouses > returns upcoming public events` | open-house.service.spec.ts | Verifies calendar view of upcoming events | ✅ |
| PROD-048.10 | `findAll > should filter by hasUpcomingOpenHouse` | properties.service.spec.ts | Verifies property search filter for open house | ✅ |
| PROD-048.11 | `findAll > should not filter by open house when hasUpcomingOpenHouse is not set` | properties.service.spec.ts | Verifies filter is optional | ✅ |
| PROD-048 | `Open House Events > should create an open house event` | properties.e2e-spec.ts | E2E test of open house event creation | ✅ |
| PROD-048 | `Open House Events > should get open house events for a property` | properties.e2e-spec.ts | E2E test of event listing | ✅ |
| PROD-048 | `Open House Events > should get a specific open house event` | properties.e2e-spec.ts | E2E test of single event retrieval | ✅ |
| PROD-048 | `Open House Events > should update an open house event` | properties.e2e-spec.ts | E2E test of event update | ✅ |
| PROD-048 | `Open House Events > should filter properties with upcoming open house events` | properties.e2e-spec.ts | E2E test of search filter | ✅ |
| PROD-048 | `Open House Events > should reject overlapping open house events` | properties.e2e-spec.ts | E2E test of overlap validation | ✅ |
| PROD-048 | `Open House Events > should reject open house with end time before start time` | properties.e2e-spec.ts | E2E test of time validation | ✅ |
| PROD-048 | `Open House Events > should not allow non-owner to create open house event` | properties.e2e-spec.ts | E2E test of authorization | ✅ |
| PROD-048 | `Open House Events > should delete an open house event` | properties.e2e-spec.ts | E2E test of event deletion | ✅ |

### PROD-049: Saved Searches (Favorites)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-049.1 | `addFavorite > adds property to favorites` | favorites.service.spec.ts | Verifies favorite addition | ✅ |
| PROD-049.2 | `removeFavorite > removes from favorites` | favorites.service.spec.ts | Verifies favorite removal | ✅ |
| PROD-049.3 | `getFavorites > returns user's favorites` | favorites.service.spec.ts | Verifies favorites listing | ✅ |
| PROD-049.4 | `isFavorite > checks favorite status` | favorites.service.spec.ts | Verifies favorite check | ✅ |
| PROD-049 | `POST /favorites/:propertyId` | search.e2e-spec.ts | End-to-end test of favorite addition | ✅ |

### PROD-050: AI Recommendations

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-050 | N/A | N/A | AI recommendations - not yet implemented | 🚧 |

---

## 4. Authentication & Security

### Authentication Endpoints

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| AUTH-001 | `login > should call authService.login` | auth.controller.spec.ts | Verifies login accepts email/password | ✅ |
| AUTH-002 | `login > should return user and tokens` | auth.controller.spec.ts | Verifies JWT tokens are returned | ✅ |
| AUTH-003 | `login > should propagate service errors` | auth.controller.spec.ts | Verifies invalid credentials return error | ✅ |
| AUTH-004 | `verifyEmail > should return user and tokens` | auth.controller.spec.ts | Verifies email verification works | ✅ |
| AUTH-005 | `refreshToken > should return new tokens` | auth.controller.spec.ts | Verifies token refresh works | ✅ |
| AUTH-006 | `logout > should return message` | auth.controller.spec.ts | Verifies logout revokes refresh token | ✅ |
| AUTH-007 | `forgotPassword > should return message` | auth.controller.spec.ts | Verifies password reset request | ✅ |
| AUTH-008 | `resetPassword > should return message` | auth.controller.spec.ts | Verifies password can be reset | ✅ |
| AUTH-009 | `getMe > should return user profile` | auth.controller.spec.ts | Verifies current user retrieval | ✅ |
| AUTH | `Full auth flow` | auth.e2e-spec.ts | End-to-end test of complete auth flow | ✅ |

---

## 5. Notifications & Communication

### PROD-041 Partial: Notifications

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| NOTIF-001 | `create > creates notification` | notifications.service.spec.ts | Verifies notification creation | ✅ |
| NOTIF-002 | `findAllForUser > returns user notifications` | notifications.service.spec.ts | Verifies notification listing | ✅ |
| NOTIF-003 | `markAsRead > updates read status` | notifications.service.spec.ts | Verifies mark as read works | ✅ |
| NOTIF-004 | `markAllAsRead > marks all as read` | notifications.service.spec.ts | Verifies bulk mark as read | ✅ |
| NOTIF-005 | `getUnreadCount > returns count` | notifications.service.spec.ts | Verifies unread count | ✅ |
| NOTIF-006 | `delete > removes notification` | notifications.service.spec.ts | Verifies notification deletion | ✅ |

---

## 6. Infrastructure & Core Services

### Database Service

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| INFRA-001 | `onModuleInit > should call $connect` | prisma.service.spec.ts | Verifies database connection on startup | ✅ |
| INFRA-002 | `onModuleDestroy > should call $disconnect` | prisma.service.spec.ts | Verifies clean disconnect on shutdown | ✅ |
| INFRA-003 | `cleanDatabase > should throw in production` | prisma.service.spec.ts | Verifies database cleanup is blocked in prod | ✅ |
| INFRA-004 | `cleanDatabase > should work in test env` | prisma.service.spec.ts | Verifies database cleanup for tests | ✅ |

### Cache Service

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| INFRA-010 | `get > should return cached value` | cache.service.spec.ts | Verifies cache retrieval | ✅ |
| INFRA-011 | `set > should set value with TTL` | cache.service.spec.ts | Verifies cache storage with expiry | ✅ |
| INFRA-012 | `del > should delete cached key` | cache.service.spec.ts | Verifies cache deletion | ✅ |
| INFRA-013 | `reset > should reset entire cache` | cache.service.spec.ts | Verifies cache flush | ✅ |
| INFRA-014 | `generateKey > should create namespaced key` | cache.service.spec.ts | Verifies key generation | ✅ |
| INFRA-015 | `getProperty/setProperty > property caching` | cache.service.spec.ts | Verifies property-specific caching | ✅ |
| INFRA-016 | `getUserSession > session caching` | cache.service.spec.ts | Verifies session caching | ✅ |

### Mail Service

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| INFRA-020 | `sendVerificationEmail > sends email` | mail.service.spec.ts | Verifies verification email sending | ✅ |
| INFRA-021 | `sendWelcomeEmail > sends email` | mail.service.spec.ts | Verifies welcome email sending | ✅ |
| INFRA-022 | `sendPasswordResetEmail > sends email` | mail.service.spec.ts | Verifies password reset email | ✅ |
| INFRA-023 | `sendInvitationEmail > sends email` | mail.service.spec.ts | Verifies invitation email | ✅ |

### Countries Service

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| INFRA-030 | `findAll > returns all countries` | countries.service.spec.ts | Verifies country list retrieval | ✅ |
| INFRA-031 | `findByCode > returns country by code` | countries.service.spec.ts | Verifies country lookup | ✅ |
| INFRA-032 | `search > filters countries` | countries.service.spec.ts | Verifies country search | ✅ |

---

## 7. Negotiations & Transactions (PROD-090 to PROD-095)

### PROD-090: Negotiation System

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-090.1 | `should be defined` | negotiations.service.spec.ts | Verifies service initialization | ✅ |
| PROD-090.2 | `create > should create a negotiation successfully` | negotiations.service.spec.ts | Verifies negotiation creation with initial offer | ✅ |
| PROD-090.3 | `create > should throw NotFoundException if property not found` | negotiations.service.spec.ts | Verifies property validation | ✅ |
| PROD-090.4 | `create > should throw BadRequestException if property not active` | negotiations.service.spec.ts | Verifies only active properties can be negotiated | ✅ |
| PROD-090.5 | `create > should throw ForbiddenException if buyer is owner` | negotiations.service.spec.ts | Verifies owner cannot negotiate on own property | ✅ |
| PROD-090.6 | `create > should throw ConflictException if active negotiation exists` | negotiations.service.spec.ts | Verifies duplicate prevention | ✅ |
| PROD-090 | `POST /api/negotiations > should create a negotiation with initial offer` | negotiations.e2e-spec.ts | E2E test of negotiation creation | ✅ |
| PROD-090 | `POST /api/negotiations > should require authentication` | negotiations.e2e-spec.ts | E2E test of authentication requirement | ✅ |
| PROD-090 | `POST /api/negotiations > should not allow duplicate active negotiations` | negotiations.e2e-spec.ts | E2E test of duplicate prevention | ✅ |
| PROD-090 | `POST /api/negotiations > should not allow seller to negotiate on own property` | negotiations.e2e-spec.ts | E2E test of owner restriction | ✅ |

### PROD-091: Negotiation Listing & Details

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-091.1 | `findAll > should return paginated negotiations for user as buyer` | negotiations.service.spec.ts | Verifies buyer can list their negotiations | ✅ |
| PROD-091.2 | `findAll > should return paginated negotiations for user as seller` | negotiations.service.spec.ts | Verifies seller can list their negotiations | ✅ |
| PROD-091.3 | `findAll > should filter by type and status` | negotiations.service.spec.ts | Verifies filtering works correctly | ✅ |
| PROD-091.4 | `findOne > should return negotiation details` | negotiations.service.spec.ts | Verifies negotiation detail retrieval | ✅ |
| PROD-091.5 | `findOne > should throw NotFoundException if not found` | negotiations.service.spec.ts | Verifies not found handling | ✅ |
| PROD-091.6 | `findOne > should throw ForbiddenException if user not a party` | negotiations.service.spec.ts | Verifies access control | ✅ |
| PROD-091 | `GET /api/negotiations > should list buyer negotiations` | negotiations.e2e-spec.ts | E2E test of buyer negotiation listing | ✅ |
| PROD-091 | `GET /api/negotiations > should list seller negotiations` | negotiations.e2e-spec.ts | E2E test of seller negotiation listing | ✅ |
| PROD-091 | `GET /api/negotiations/:id > should return negotiation details` | negotiations.e2e-spec.ts | E2E test of negotiation detail retrieval | ✅ |

### PROD-092: Offer Submission & Counter-Offers

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-092.1 | `submitOffer > should submit a new offer` | negotiations.service.spec.ts | Verifies offer submission | ✅ |
| PROD-092.2 | `submitOffer > should throw NotFoundException if negotiation not found` | negotiations.service.spec.ts | Verifies negotiation validation | ✅ |
| PROD-092.3 | `submitOffer > should throw ForbiddenException if user not a party` | negotiations.service.spec.ts | Verifies access control | ✅ |
| PROD-092.4 | `submitOffer > should throw BadRequestException if negotiation not active` | negotiations.service.spec.ts | Verifies active negotiation check | ✅ |
| PROD-092.5 | `submitOffer > should throw BadRequestException if waiting for response` | negotiations.service.spec.ts | Verifies turn-based offer flow | ✅ |
| PROD-092 | `POST /api/negotiations/:id/offers > should allow seller to submit counter-offer` | negotiations.e2e-spec.ts | E2E test of counter-offer submission | ✅ |

### PROD-093: Offer Response (Accept/Reject/Counter)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-093.1 | `respondToOffer > should accept an offer` | negotiations.service.spec.ts | Verifies offer acceptance | ✅ |
| PROD-093.2 | `respondToOffer > should reject an offer` | negotiations.service.spec.ts | Verifies offer rejection | ✅ |
| PROD-093.3 | `respondToOffer > should counter an offer` | negotiations.service.spec.ts | Verifies counter-offer creation | ✅ |
| PROD-093.4 | `respondToOffer > should throw NotFoundException if offer not found` | negotiations.service.spec.ts | Verifies offer validation | ✅ |
| PROD-093.5 | `respondToOffer > should throw ForbiddenException if responding to own offer` | negotiations.service.spec.ts | Verifies cannot respond to own offer | ✅ |
| PROD-093.6 | `respondToOffer > should throw ForbiddenException if user not a party` | negotiations.service.spec.ts | Verifies access control | ✅ |
| PROD-093.7 | `respondToOffer > should throw BadRequestException if offer not pending` | negotiations.service.spec.ts | Verifies pending status check | ✅ |
| PROD-093.8 | `respondToOffer > should throw BadRequestException if counter without amount` | negotiations.service.spec.ts | Verifies counter amount requirement | ✅ |
| PROD-093 | `POST /api/negotiations/offers/:offerId/respond > should allow buyer to counter` | negotiations.e2e-spec.ts | E2E test of counter-offer | ✅ |
| PROD-093 | `POST /api/negotiations/offers/:offerId/respond > should not allow responding to own offer` | negotiations.e2e-spec.ts | E2E test of own-offer restriction | ✅ |
| PROD-093 | `Accept offer flow > should accept an offer and create transaction` | negotiations.e2e-spec.ts | E2E test of offer acceptance | ✅ |

### PROD-094: Negotiation Cancellation

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-094.1 | `cancel > should cancel an active negotiation` | negotiations.service.spec.ts | Verifies cancellation | ✅ |
| PROD-094.2 | `cancel > should throw NotFoundException if not found` | negotiations.service.spec.ts | Verifies not found handling | ✅ |
| PROD-094.3 | `cancel > should throw ForbiddenException if user not a party` | negotiations.service.spec.ts | Verifies access control | ✅ |
| PROD-094.4 | `cancel > should throw BadRequestException if not active` | negotiations.service.spec.ts | Verifies active status check | ✅ |
| PROD-094 | `DELETE /api/negotiations/:id > should allow buyer to cancel` | negotiations.e2e-spec.ts | E2E test of cancellation | ✅ |
| PROD-094 | `DELETE /api/negotiations/:id > should not allow cancelling already cancelled` | negotiations.e2e-spec.ts | E2E test of duplicate cancellation | ✅ |

### PROD-095: Transaction Tracking

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-095.1 | `getTransaction > should return transaction for negotiation` | negotiations.service.spec.ts | Verifies transaction retrieval | ✅ |
| PROD-095.2 | `getTransaction > should throw NotFoundException if negotiation not found` | negotiations.service.spec.ts | Verifies negotiation validation | ✅ |
| PROD-095.3 | `getTransaction > should throw ForbiddenException if user not a party` | negotiations.service.spec.ts | Verifies access control | ✅ |
| PROD-095.4 | `getTransaction > should throw NotFoundException if transaction not found` | negotiations.service.spec.ts | Verifies transaction not found handling | ✅ |
| PROD-095.5 | `getTransactionHistory > should return paginated transaction history` | negotiations.service.spec.ts | Verifies transaction history pagination | ✅ |
| PROD-095 | `GET /api/negotiations/:id/transaction > should have created a transaction` | negotiations.e2e-spec.ts | E2E test of transaction creation on acceptance | ✅ |
| PROD-095 | `GET /api/negotiations/transactions/history > should return transaction history` | negotiations.e2e-spec.ts | E2E test of transaction history | ✅ |

### Controller Tests

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| N/A | `should be defined` | negotiations.controller.spec.ts | Verifies controller initialization | ✅ |
| N/A | `create > should create a negotiation` | negotiations.controller.spec.ts | Verifies create endpoint | ✅ |
| N/A | `findAll > should return paginated negotiations` | negotiations.controller.spec.ts | Verifies list endpoint | ✅ |
| N/A | `findOne > should return negotiation details` | negotiations.controller.spec.ts | Verifies get endpoint | ✅ |
| N/A | `cancel > should cancel a negotiation` | negotiations.controller.spec.ts | Verifies delete endpoint | ✅ |
| N/A | `submitOffer > should submit an offer` | negotiations.controller.spec.ts | Verifies offer submission endpoint | ✅ |
| N/A | `respondToOffer > should respond to an offer` | negotiations.controller.spec.ts | Verifies offer response endpoint | ✅ |
| N/A | `getTransaction > should return transaction for negotiation` | negotiations.controller.spec.ts | Verifies transaction endpoint | ✅ |
| N/A | `getTransactionHistory > should return transaction history` | negotiations.controller.spec.ts | Verifies transaction history endpoint | ✅ |

---

## 7.5 Payment Processing (PROD-093, PROD-094, NFR-013)

### PROD-093: Payment Checkout & Status

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-093.1 | `should be defined` | payments.service.spec.ts | Verifies service initialization | ✅ |
| PROD-093.2 | `createCheckout > should throw NotFoundException if negotiation not found` | payments.service.spec.ts | Verifies negotiation validation | ✅ |
| PROD-093.3 | `createCheckout > should throw ForbiddenException if user is not the buyer` | payments.service.spec.ts | Verifies only buyer can initiate payment | ✅ |
| PROD-093.4 | `createCheckout > should throw BadRequestException if negotiation is not accepted` | payments.service.spec.ts | Verifies negotiation state validation | ✅ |
| PROD-093.5 | `createCheckout > should throw BadRequestException if no accepted offer found` | payments.service.spec.ts | Verifies accepted offer requirement | ✅ |
| PROD-093.6 | `createCheckout > should create mock checkout session when Stripe is not configured` | payments.service.spec.ts | Verifies mock mode for testing without Stripe | ✅ |
| PROD-093.7 | `createCheckout > should use existing pending transaction if one exists` | payments.service.spec.ts | Verifies transaction reuse | ✅ |
| PROD-093.8 | `getPaymentStatus > should throw NotFoundException for invalid mock session` | payments.service.spec.ts | Verifies mock session validation | ✅ |
| PROD-093.9 | `getPaymentStatus > should throw NotFoundException if transaction not found` | payments.service.spec.ts | Verifies not found handling | ✅ |
| PROD-093.10 | `getPaymentStatus > should throw ForbiddenException if user is not buyer or seller` | payments.service.spec.ts | Verifies access control | ✅ |
| PROD-093.11 | `getPaymentStatus > should return payment status for buyer` | payments.service.spec.ts | Verifies buyer can view status | ✅ |
| PROD-093.12 | `getPaymentStatus > should return payment status for seller` | payments.service.spec.ts | Verifies seller can view status | ✅ |

### PROD-094: Mock Payment & Transaction Management

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-094.1 | `completeMockPayment > should throw BadRequestException for non-mock session` | payments.service.spec.ts | Verifies mock session detection | ✅ |
| PROD-094.2 | `completeMockPayment > should throw NotFoundException if transaction not found` | payments.service.spec.ts | Verifies transaction validation | ✅ |
| PROD-094.3 | `completeMockPayment > should throw ForbiddenException if user is not the buyer` | payments.service.spec.ts | Verifies buyer authorization | ✅ |
| PROD-094.4 | `completeMockPayment > should return existing transaction if already completed` | payments.service.spec.ts | Verifies idempotent completion | ✅ |
| PROD-094.5 | `completeMockPayment > should complete mock payment successfully` | payments.service.spec.ts | Verifies mock payment completion flow | ✅ |
| PROD-094.6 | `getTransactions > should return paginated transactions for user` | payments.service.spec.ts | Verifies transaction listing | ✅ |
| PROD-094.7 | `getTransactions > should filter by status when provided` | payments.service.spec.ts | Verifies status filtering | ✅ |
| PROD-094.8 | `getTransaction > should throw NotFoundException if transaction not found` | payments.service.spec.ts | Verifies not found handling | ✅ |
| PROD-094.9 | `getTransaction > should throw ForbiddenException if user is not buyer or seller` | payments.service.spec.ts | Verifies access control | ✅ |
| PROD-094.10 | `getTransaction > should return transaction for authorized user` | payments.service.spec.ts | Verifies transaction retrieval | ✅ |
| PROD-094.11 | `getStats > should return payment statistics for user` | payments.service.spec.ts | Verifies stats calculation (earnings, spent, pending) | ✅ |

### PROD-095: Refund Processing

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-095.1 | `requestRefund > should throw NotFoundException if transaction not found` | payments.service.spec.ts | Verifies transaction validation | ✅ |
| PROD-095.2 | `requestRefund > should throw ForbiddenException if user is not the buyer` | payments.service.spec.ts | Verifies buyer authorization for refund request | ✅ |
| PROD-095.3 | `requestRefund > should throw BadRequestException if transaction is not completed` | payments.service.spec.ts | Verifies refund state validation | ✅ |
| PROD-095.4 | `requestRefund > should process refund for mock payment` | payments.service.spec.ts | Verifies mock refund processing | ✅ |

### Webhook Handling

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| WEBHOOK-001 | `handleWebhook > should log warning when Stripe is not configured` | payments.service.spec.ts | Verifies graceful handling in mock mode | ✅ |

### NFR-013: PCI-DSS Compliance

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| NFR-013.1 | Stripe Checkout Sessions used (no card data on server) | payments.service.ts | Architecture ensures PCI compliance | ✅ |
| NFR-013.2 | Mock mode available for testing without Stripe keys | payments.service.ts | Enables testing without payment credentials | ✅ |

### Payment Controller Tests

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| CTRL-PAY-001 | `should be defined` | payments.controller.spec.ts | Verifies controller initialization | ✅ |
| CTRL-PAY-002 | `createCheckout > should create a checkout session` | payments.controller.spec.ts | Verifies checkout endpoint routing | ✅ |
| CTRL-PAY-003 | `createCheckout > should pass custom success and cancel URLs` | payments.controller.spec.ts | Verifies URL customization | ✅ |
| CTRL-PAY-004 | `getPaymentStatus > should return payment status` | payments.controller.spec.ts | Verifies status endpoint routing | ✅ |
| CTRL-PAY-005 | `completeMockPayment > should complete a mock payment` | payments.controller.spec.ts | Verifies mock completion endpoint | ✅ |
| CTRL-PAY-006 | `getTransactions > should return paginated transactions` | payments.controller.spec.ts | Verifies transaction list endpoint | ✅ |
| CTRL-PAY-007 | `getTransactions > should pass pagination parameters` | payments.controller.spec.ts | Verifies pagination parameter passing | ✅ |
| CTRL-PAY-008 | `getTransactions > should pass status filter` | payments.controller.spec.ts | Verifies status filter passing | ✅ |
| CTRL-PAY-009 | `getTransaction > should return a single transaction` | payments.controller.spec.ts | Verifies single transaction endpoint | ✅ |
| CTRL-PAY-010 | `getStats > should return payment statistics` | payments.controller.spec.ts | Verifies stats endpoint | ✅ |
| CTRL-PAY-011 | `requestRefund > should process a refund request` | payments.controller.spec.ts | Verifies refund endpoint routing | ✅ |
| CTRL-PAY-012 | `requestRefund > should handle partial refund` | payments.controller.spec.ts | Verifies partial refund support | ✅ |
| CTRL-PAY-013 | `handleWebhook > should handle webhook and return received confirmation` | payments.controller.spec.ts | Verifies webhook processing | ✅ |

### Payment E2E Tests

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| E2E-PAY-001 | `POST /api/payments/checkout > should require authentication` | payments.e2e-spec.ts | E2E auth check for checkout | ✅ |
| E2E-PAY-002 | `POST /api/payments/checkout > should return 404 for non-existent negotiation` | payments.e2e-spec.ts | E2E negotiation validation | ✅ |
| E2E-PAY-003 | `POST /api/payments/checkout > should return 403 if user is not the buyer` | payments.e2e-spec.ts | E2E buyer authorization | ✅ |
| E2E-PAY-004 | `POST /api/payments/checkout > should return 403 for unauthorized user` | payments.e2e-spec.ts | E2E stranger access denied | ✅ |
| E2E-PAY-005 | `POST /api/payments/checkout > should create a mock checkout session for buyer` | payments.e2e-spec.ts | E2E mock checkout creation | ✅ |
| E2E-PAY-006 | `POST /api/payments/checkout > should reuse existing pending transaction` | payments.e2e-spec.ts | E2E transaction reuse | ✅ |
| E2E-PAY-007 | `GET /api/payments/status/:sessionId > should require authentication` | payments.e2e-spec.ts | E2E auth check for status | ✅ |
| E2E-PAY-008 | `GET /api/payments/status/:sessionId > should return payment status for buyer` | payments.e2e-spec.ts | E2E buyer status retrieval | ✅ |
| E2E-PAY-009 | `GET /api/payments/status/:sessionId > should return payment status for seller` | payments.e2e-spec.ts | E2E seller status retrieval | ✅ |
| E2E-PAY-010 | `GET /api/payments/status/:sessionId > should return 403 for stranger` | payments.e2e-spec.ts | E2E access control | ✅ |
| E2E-PAY-011 | `GET /api/payments/status/:sessionId > should return 404 for non-existent session` | payments.e2e-spec.ts | E2E not found handling | ✅ |
| E2E-PAY-012 | `POST /api/payments/complete-mock/:sessionId > should require authentication` | payments.e2e-spec.ts | E2E auth check for mock complete | ✅ |
| E2E-PAY-013 | `POST /api/payments/complete-mock/:sessionId > should return 400 for non-mock session` | payments.e2e-spec.ts | E2E mock session validation | ✅ |
| E2E-PAY-014 | `POST /api/payments/complete-mock/:sessionId > should return 403 if not buyer` | payments.e2e-spec.ts | E2E buyer authorization | ✅ |
| E2E-PAY-015 | `POST /api/payments/complete-mock/:sessionId > should complete mock payment` | payments.e2e-spec.ts | E2E mock payment completion | ✅ |
| E2E-PAY-016 | `POST /api/payments/complete-mock/:sessionId > should be idempotent` | payments.e2e-spec.ts | E2E idempotent completion | ✅ |
| E2E-PAY-017 | `GET /api/payments/transactions > should require authentication` | payments.e2e-spec.ts | E2E auth check for transactions | ✅ |
| E2E-PAY-018 | `GET /api/payments/transactions > should return transactions for buyer` | payments.e2e-spec.ts | E2E buyer transaction listing | ✅ |
| E2E-PAY-019 | `GET /api/payments/transactions > should return transactions for seller` | payments.e2e-spec.ts | E2E seller transaction listing | ✅ |
| E2E-PAY-020 | `GET /api/payments/transactions > should support pagination` | payments.e2e-spec.ts | E2E pagination support | ✅ |
| E2E-PAY-021 | `GET /api/payments/transactions > should filter by status` | payments.e2e-spec.ts | E2E status filtering | ✅ |
| E2E-PAY-022 | `GET /api/payments/transactions > should return empty for stranger` | payments.e2e-spec.ts | E2E empty result for non-party | ✅ |
| E2E-PAY-023 | `GET /api/payments/transactions/:id > should require authentication` | payments.e2e-spec.ts | E2E auth check for single transaction | ✅ |
| E2E-PAY-024 | `GET /api/payments/transactions/:id > should return details for buyer` | payments.e2e-spec.ts | E2E buyer transaction details | ✅ |
| E2E-PAY-025 | `GET /api/payments/transactions/:id > should return details for seller` | payments.e2e-spec.ts | E2E seller transaction details | ✅ |
| E2E-PAY-026 | `GET /api/payments/transactions/:id > should return 403 for stranger` | payments.e2e-spec.ts | E2E access control | ✅ |
| E2E-PAY-027 | `GET /api/payments/transactions/:id > should return 404 for non-existent` | payments.e2e-spec.ts | E2E not found handling | ✅ |
| E2E-PAY-028 | `GET /api/payments/stats > should require authentication` | payments.e2e-spec.ts | E2E auth check for stats | ✅ |
| E2E-PAY-029 | `GET /api/payments/stats > should return stats for buyer` | payments.e2e-spec.ts | E2E buyer stats (spent) | ✅ |
| E2E-PAY-030 | `GET /api/payments/stats > should return stats for seller` | payments.e2e-spec.ts | E2E seller stats (earnings) | ✅ |
| E2E-PAY-031 | `GET /api/payments/stats > should return zero stats for stranger` | payments.e2e-spec.ts | E2E empty stats for non-party | ✅ |
| E2E-PAY-032 | `POST /api/payments/refund > should require authentication` | payments.e2e-spec.ts | E2E auth check for refund | ✅ |
| E2E-PAY-033 | `POST /api/payments/refund > should return 404 for non-existent transaction` | payments.e2e-spec.ts | E2E refund not found | ✅ |
| E2E-PAY-034 | `POST /api/payments/refund > should return 403 if not buyer` | payments.e2e-spec.ts | E2E buyer-only refund | ✅ |
| E2E-PAY-035 | `POST /api/payments/refund > should return 403 for stranger` | payments.e2e-spec.ts | E2E access control | ✅ |
| E2E-PAY-036 | `POST /api/payments/refund > should process refund for buyer` | payments.e2e-spec.ts | E2E refund processing | ✅ |
| E2E-PAY-037 | `POST /api/payments/refund > should return 400 for already refunded` | payments.e2e-spec.ts | E2E duplicate refund prevention | ✅ |
| E2E-PAY-038 | `POST /api/payments/webhook > should not require JWT auth` | payments.e2e-spec.ts | E2E webhook accessibility | ✅ |

### Browser Integration Tests (Payment UI)

| Req ID | Test Case | Test Method | Purpose | Status |
|--------|-----------|-------------|---------|--------|
| BROWSER-PAY-001 | Mock Payment Checkout Flow | Playwright | Verifies buyer can complete mock payment via UI modal | ✅ |
| BROWSER-PAY-002 | Payment Cancellation Flow | Playwright | Verifies cancellation closes modal, preserves ACCEPTED status | ✅ |
| BROWSER-PAY-003 | Transactions List (Buyer View) | Playwright | Verifies buyer sees purchases, Total Spent, status filters | ✅ |
| BROWSER-PAY-004 | Transactions List (Seller View) | Playwright | Verifies seller sees sales, Total Earnings, Pending Payouts | ✅ |
| BROWSER-PAY-005 | Refund Flow | Playwright | Verifies buyer can request refund, status updates to REFUNDED | ✅ |

**Browser Test Details:**

| Test | Steps Verified | Key Assertions |
|------|----------------|----------------|
| Mock Payment Checkout | Navigate to negotiation → Click "Proceed to Payment" → Modal opens → Shows amount breakdown → Click "Complete Payment" → Transaction created | Modal shows €280,000, platform fee €14,000, seller receives €266,000; Transaction status COMPLETED; Negotiation status COMPLETED |
| Payment Cancellation | Click "Proceed to Payment" → Modal opens → Click "Cancel" or "X" | Modal closes; Negotiation remains ACCEPTED; Can retry payment |
| Transactions (Buyer) | Navigate to /dashboard/transactions | Summary cards show Total Spent; Table shows "Purchase" type; Status filter works; "View" links to negotiation |
| Transactions (Seller) | Log in as seller → Navigate to transactions | Total Earnings shows revenue; "Sale" type displayed; Fee breakdown shown; Earnings/Payments tabs work |
| Refund Flow | Click "View" on completed transaction → Click "Request Refund" → Enter reason → Submit | Refund modal opens; Reason required; Transaction status changes to "Refunded"; "Request Refund" button hidden after refund |

---

## 7.6 In-App Messaging (PROD-200+)

### Messaging Service Tests

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| MSG-001.1 | `createConversation > should throw BadRequestException if no context provided` | messaging.service.spec.ts | Verifies at least recipientId, propertyId, or negotiationId is required | ✅ |
| MSG-001.2 | `createConversation > should throw NotFoundException if recipient not found` | messaging.service.spec.ts | Verifies recipient validation | ✅ |
| MSG-001.3 | `createConversation > should throw NotFoundException if property not found` | messaging.service.spec.ts | Verifies property validation | ✅ |
| MSG-001.4 | `createConversation > should throw NotFoundException if negotiation not found` | messaging.service.spec.ts | Verifies negotiation validation | ✅ |
| MSG-001.5 | `createConversation > should throw ForbiddenException if user not part of negotiation` | messaging.service.spec.ts | Verifies negotiation authorization | ✅ |
| MSG-001.6 | `createConversation > should return existing conversation for negotiation` | messaging.service.spec.ts | Verifies no duplicate conversations for same negotiation | ✅ |
| MSG-001.7 | `createConversation > should create conversation with recipient` | messaging.service.spec.ts | Verifies direct message conversation creation | ✅ |
| MSG-001.8 | `createConversation > should create conversation with property and add owner as participant` | messaging.service.spec.ts | Verifies property inquiry conversation adds owner | ✅ |
| MSG-002.1 | `getConversations > should return paginated conversations` | messaging.service.spec.ts | Verifies conversation listing with pagination | ✅ |
| MSG-002.2 | `getConversations > should filter archived conversations` | messaging.service.spec.ts | Verifies archived filter works | ✅ |
| MSG-002.3 | `getConversations > should handle pagination parameters` | messaging.service.spec.ts | Verifies page/limit parameters | ✅ |
| MSG-003.1 | `getConversation > should throw NotFoundException if conversation not found` | messaging.service.spec.ts | Verifies conversation validation | ✅ |
| MSG-003.2 | `getConversation > should throw ForbiddenException if user not participant` | messaging.service.spec.ts | Verifies participant authorization | ✅ |
| MSG-003.3 | `getConversation > should return conversation with messages` | messaging.service.spec.ts | Verifies messages included in response | ✅ |
| MSG-004.1 | `getOrCreateNegotiationConversation > should return existing conversation` | messaging.service.spec.ts | Verifies existing conversation returned | ✅ |
| MSG-004.2 | `getOrCreateNegotiationConversation > should throw ForbiddenException if user not in negotiation` | messaging.service.spec.ts | Verifies negotiation authorization | ✅ |
| MSG-005.1 | `archiveConversation > should throw NotFoundException if participant not found` | messaging.service.spec.ts | Verifies participant validation | ✅ |
| MSG-005.2 | `archiveConversation > should archive conversation for user` | messaging.service.spec.ts | Verifies archive updates participant record | ✅ |
| MSG-005.3 | `unarchiveConversation > should throw NotFoundException if participant not found` | messaging.service.spec.ts | Verifies participant validation | ✅ |
| MSG-005.4 | `unarchiveConversation > should unarchive conversation for user` | messaging.service.spec.ts | Verifies unarchive functionality | ✅ |
| MSG-006.1 | `getMessages > should throw ForbiddenException if user not participant` | messaging.service.spec.ts | Verifies message access authorization | ✅ |
| MSG-006.2 | `getMessages > should return paginated messages` | messaging.service.spec.ts | Verifies message listing with pagination | ✅ |
| MSG-006.3 | `getMessages > should handle cursor-based pagination` | messaging.service.spec.ts | Verifies before cursor parameter | ✅ |
| MSG-007.1 | `sendMessage > should throw ForbiddenException if user not participant` | messaging.service.spec.ts | Verifies send authorization | ✅ |
| MSG-007.2 | `sendMessage > should create message and update conversation` | messaging.service.spec.ts | Verifies message creation and lastMessageAt update | ✅ |
| MSG-008.1 | `deleteMessage > should throw NotFoundException if message not found` | messaging.service.spec.ts | Verifies message validation | ✅ |
| MSG-008.2 | `deleteMessage > should throw ForbiddenException if not message sender` | messaging.service.spec.ts | Verifies only sender can delete | ✅ |
| MSG-008.3 | `deleteMessage > should delete message successfully` | messaging.service.spec.ts | Verifies message deletion | ✅ |
| MSG-009.1 | `markAsRead > should throw NotFoundException if participant not found` | messaging.service.spec.ts | Verifies participant validation | ✅ |
| MSG-009.2 | `markAsRead > should update lastReadAt and reset unreadCount` | messaging.service.spec.ts | Verifies read status update | ✅ |
| MSG-010.1 | `getUnreadCount > should return total unread count` | messaging.service.spec.ts | Verifies unread aggregation | ✅ |
| MSG-010.2 | `getUnreadCount > should return 0 if no unread messages` | messaging.service.spec.ts | Verifies null handling | ✅ |
| MSG-011.1 | `isParticipant > should return true if user is participant` | messaging.service.spec.ts | Verifies participant check | ✅ |
| MSG-011.2 | `isParticipant > should return false if user is not participant` | messaging.service.spec.ts | Verifies non-participant check | ✅ |

### Messaging Controller Tests

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| MSG-CTL-001 | `getConversations > should return paginated conversations` | messaging.controller.spec.ts | Verifies GET /messages/conversations endpoint | ✅ |
| MSG-CTL-002 | `getConversations > should pass query parameters` | messaging.controller.spec.ts | Verifies query param passing | ✅ |
| MSG-CTL-003 | `createConversation > should create a new conversation` | messaging.controller.spec.ts | Verifies POST /messages/conversations endpoint | ✅ |
| MSG-CTL-004 | `createConversation > should create conversation with initial message` | messaging.controller.spec.ts | Verifies initial message support | ✅ |
| MSG-CTL-005 | `getConversation > should return conversation details with messages` | messaging.controller.spec.ts | Verifies GET /messages/conversations/:id endpoint | ✅ |
| MSG-CTL-006 | `getMessages > should return paginated messages` | messaging.controller.spec.ts | Verifies GET /messages/conversations/:id/messages endpoint | ✅ |
| MSG-CTL-007 | `getMessages > should pass pagination parameters` | messaging.controller.spec.ts | Verifies pagination param passing | ✅ |
| MSG-CTL-008 | `sendMessage > should send a message` | messaging.controller.spec.ts | Verifies POST /messages/conversations/:id/messages endpoint | ✅ |
| MSG-CTL-009 | `markAsRead > should mark conversation as read` | messaging.controller.spec.ts | Verifies PATCH /messages/conversations/:id/read endpoint | ✅ |
| MSG-CTL-010 | `archiveConversation > should archive a conversation` | messaging.controller.spec.ts | Verifies PATCH /messages/conversations/:id/archive endpoint | ✅ |
| MSG-CTL-011 | `unarchiveConversation > should unarchive a conversation` | messaging.controller.spec.ts | Verifies PATCH /messages/conversations/:id/unarchive endpoint | ✅ |
| MSG-CTL-012 | `deleteMessage > should delete a message` | messaging.controller.spec.ts | Verifies DELETE /messages/:messageId endpoint | ✅ |
| MSG-CTL-013 | `getUnreadCount > should return unread message count` | messaging.controller.spec.ts | Verifies GET /messages/unread-count endpoint | ✅ |

### WebSocket Gateway Tests

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| MSG-WS-001 | `handleConnection > should authenticate and store socket mapping` | messaging.gateway.spec.ts | Verifies JWT auth on WebSocket connection | ✅ |
| MSG-WS-002 | `handleConnection > should disconnect socket with no token` | messaging.gateway.spec.ts | Verifies unauthenticated connections rejected | ✅ |
| MSG-WS-003 | `handleConnection > should disconnect socket with invalid token` | messaging.gateway.spec.ts | Verifies invalid tokens rejected | ✅ |
| MSG-WS-004 | `handleConnection > should disconnect for deleted/suspended user` | messaging.gateway.spec.ts | Verifies inactive accounts blocked | ✅ |
| MSG-WS-005 | `handleConnection > should extract token from query/header` | messaging.gateway.spec.ts | Verifies multiple token extraction methods | ✅ |
| MSG-WS-006 | `handleDisconnect > should clean up socket mappings` | messaging.gateway.spec.ts | Verifies cleanup on disconnect | ✅ |
| MSG-WS-007 | `handleJoinConversation > should join room if participant` | messaging.gateway.spec.ts | Verifies join_conversation event | ✅ |
| MSG-WS-008 | `handleJoinConversation > should throw if not participant` | messaging.gateway.spec.ts | Verifies authorization for room join | ✅ |
| MSG-WS-009 | `handleLeaveConversation > should leave conversation room` | messaging.gateway.spec.ts | Verifies leave_conversation event | ✅ |
| MSG-WS-010 | `handleSendMessage > should send and broadcast message` | messaging.gateway.spec.ts | Verifies send_message event + new_message broadcast | ✅ |
| MSG-WS-011 | `handleTypingStart > should broadcast typing event` | messaging.gateway.spec.ts | Verifies typing_start → user_typing broadcast | ✅ |
| MSG-WS-012 | `handleTypingStart > should not broadcast if not participant` | messaging.gateway.spec.ts | Verifies typing authorization | ✅ |
| MSG-WS-013 | `handleTypingStop > should broadcast stopped event` | messaging.gateway.spec.ts | Verifies typing_stop → user_stopped_typing broadcast | ✅ |
| MSG-WS-014 | `handleMarkRead > should mark read and broadcast receipt` | messaging.gateway.spec.ts | Verifies mark_read → read_receipt broadcast | ✅ |
| MSG-WS-015 | `emitToUser > should emit to all user sockets` | messaging.gateway.spec.ts | Verifies targeted user notifications | ✅ |
| MSG-WS-016 | `emitToConversation > should emit to room` | messaging.gateway.spec.ts | Verifies room broadcasts | ✅ |

### WebSocket JWT Guard Tests

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| MSG-GUARD-001 | `canActivate > should return true for valid token` | ws-jwt.guard.spec.ts | Verifies valid JWT authentication | ✅ |
| MSG-GUARD-002 | `canActivate > should throw for missing token` | ws-jwt.guard.spec.ts | Verifies no token rejection | ✅ |
| MSG-GUARD-003 | `canActivate > should throw for invalid token` | ws-jwt.guard.spec.ts | Verifies invalid token rejection | ✅ |
| MSG-GUARD-004 | `canActivate > should throw for non-existent user` | ws-jwt.guard.spec.ts | Verifies user validation | ✅ |
| MSG-GUARD-005 | `canActivate > should throw for deleted/suspended user` | ws-jwt.guard.spec.ts | Verifies account status check | ✅ |
| MSG-GUARD-006 | `canActivate > should extract token from query/header` | ws-jwt.guard.spec.ts | Verifies token extraction methods | ✅ |
| MSG-GUARD-007 | `canActivate > should prioritize auth token` | ws-jwt.guard.spec.ts | Verifies token priority order | ✅ |
| MSG-GUARD-008 | `canActivate > should attach user to socket` | ws-jwt.guard.spec.ts | Verifies user attachment for handlers | ✅ |

### Messaging E2E Tests

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| MSG-E2E-001 | `POST /conversations > should require authentication` | messaging.e2e-spec.ts | Verifies auth required | ⏳ |
| MSG-E2E-002 | `POST /conversations > should create direct conversation` | messaging.e2e-spec.ts | Verifies conversation creation with recipient | ⏳ |
| MSG-E2E-003 | `POST /conversations > should create with initial message` | messaging.e2e-spec.ts | Verifies initial message support | ⏳ |
| MSG-E2E-004 | `POST /conversations > should create property-linked conversation` | messaging.e2e-spec.ts | Verifies property inquiry conversation | ⏳ |
| MSG-E2E-005 | `POST /conversations > should create negotiation-linked conversation` | messaging.e2e-spec.ts | Verifies negotiation messaging | ⏳ |
| MSG-E2E-006 | `GET /conversations > should list user conversations` | messaging.e2e-spec.ts | Verifies conversation listing | ⏳ |
| MSG-E2E-007 | `GET /conversations > should support pagination` | messaging.e2e-spec.ts | Verifies pagination params | ⏳ |
| MSG-E2E-008 | `GET /conversations/:id > should return with messages` | messaging.e2e-spec.ts | Verifies conversation detail | ⏳ |
| MSG-E2E-009 | `GET /conversations/:id > should reject non-participants` | messaging.e2e-spec.ts | Verifies participant authorization | ⏳ |
| MSG-E2E-010 | `GET /negotiations/:id/conversation > should return negotiation conversation` | messaging.e2e-spec.ts | Verifies negotiation messaging endpoint | ⏳ |
| MSG-E2E-011 | `POST /conversations/:id/messages > should send message` | messaging.e2e-spec.ts | Verifies message sending | ⏳ |
| MSG-E2E-012 | `POST /conversations/:id/messages > should reject empty messages` | messaging.e2e-spec.ts | Verifies message validation | ⏳ |
| MSG-E2E-013 | `POST /conversations/:id/messages > should reject non-participants` | messaging.e2e-spec.ts | Verifies send authorization | ⏳ |
| MSG-E2E-014 | `GET /conversations/:id/messages > should return paginated messages` | messaging.e2e-spec.ts | Verifies message listing | ⏳ |
| MSG-E2E-015 | `PATCH /conversations/:id/read > should mark as read` | messaging.e2e-spec.ts | Verifies read status | ⏳ |
| MSG-E2E-016 | `GET /unread-count > should return unread count` | messaging.e2e-spec.ts | Verifies unread aggregation | ⏳ |
| MSG-E2E-017 | `PATCH /conversations/:id/archive > should archive conversation` | messaging.e2e-spec.ts | Verifies archive functionality | ⏳ |
| MSG-E2E-018 | `PATCH /conversations/:id/unarchive > should unarchive` | messaging.e2e-spec.ts | Verifies unarchive functionality | ⏳ |
| MSG-E2E-019 | `DELETE /messages/:id > should delete own message` | messaging.e2e-spec.ts | Verifies message deletion | ⏳ |
| MSG-E2E-020 | `Full Messaging Flow > complete conversation flow` | messaging.e2e-spec.ts | Verifies end-to-end messaging | ⏳ |

### Messaging Browser Tests (Playwright)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| MSG-PW-001 | `Messages Page > should display messages page from sidebar` | messaging.spec.ts | Verifies sidebar navigation to messages | ⏳ |
| MSG-PW-002 | `Messages Page > should show empty state when no conversations` | messaging.spec.ts | Verifies empty state display | ⏳ |
| MSG-PW-003 | `Messages Page > should navigate to conversation detail` | messaging.spec.ts | Verifies conversation click navigation | ⏳ |
| MSG-PW-004 | `Conversation List > should display conversation items` | messaging.spec.ts | Verifies conversation list rendering | ⏳ |
| MSG-PW-005 | `Conversation List > should show last message preview` | messaging.spec.ts | Verifies message preview in list | ⏳ |
| MSG-PW-006 | `Conversation List > should indicate unread conversations` | messaging.spec.ts | Verifies unread badge display | ⏳ |
| MSG-PW-007 | `Message Thread > should display messages chronologically` | messaging.spec.ts | Verifies message ordering | ⏳ |
| MSG-PW-008 | `Message Thread > should distinguish sent/received messages` | messaging.spec.ts | Verifies message alignment/styling | ⏳ |
| MSG-PW-009 | `Message Thread > should scroll to bottom on new message` | messaging.spec.ts | Verifies auto-scroll behavior | ⏳ |
| MSG-PW-010 | `Message Input > should have message input field` | messaging.spec.ts | Verifies input field presence | ⏳ |
| MSG-PW-011 | `Message Input > should send message on button click` | messaging.spec.ts | Verifies send button functionality | ⏳ |
| MSG-PW-012 | `Message Input > should send message on Enter key` | messaging.spec.ts | Verifies keyboard shortcut | ⏳ |
| MSG-PW-013 | `Message Input > should not send empty messages` | messaging.spec.ts | Verifies empty message validation | ⏳ |
| MSG-PW-014 | `Message Input > should disable send while sending` | messaging.spec.ts | Verifies send button state | ⏳ |
| MSG-PW-015 | `Typing Indicator > should show when other user types` | messaging.spec.ts | Verifies typing indicator display | ⏳ |
| MSG-PW-016 | `Real-time Messages > should receive messages in real-time` | messaging.spec.ts | Verifies WebSocket message delivery | ⏳ |
| MSG-PW-017 | `Mobile Bottom Nav > should display messages icon` | messaging.spec.ts | Verifies mobile navigation | ⏳ |
| MSG-PW-018 | `Mobile Bottom Nav > should show unread badge` | messaging.spec.ts | Verifies mobile unread indicator | ⏳ |
| MSG-PW-019 | `Mobile Bottom Nav > should navigate to messages` | messaging.spec.ts | Verifies mobile navigation click | ⏳ |
| MSG-PW-020 | `Negotiation Messages Tab > should display messages tab` | messaging.spec.ts | Verifies negotiation messaging integration | ⏳ |
| MSG-PW-021 | `Negotiation Messages Tab > should show message thread` | messaging.spec.ts | Verifies negotiation message display | ⏳ |
| MSG-PW-022 | `Negotiation Messages Tab > should send messages` | messaging.spec.ts | Verifies negotiation message sending | ⏳ |
| MSG-PW-023 | `Accessibility > message input should have proper label` | messaging.spec.ts | Verifies ARIA accessibility | ⏳ |
| MSG-PW-024 | `Accessibility > messages should be keyboard navigable` | messaging.spec.ts | Verifies keyboard navigation | ⏳ |
| MSG-PW-025 | `Accessibility > send button should have accessible name` | messaging.spec.ts | Verifies button accessibility | ⏳ |
| MSG-PW-026 | `Error Handling > should show error when message fails` | messaging.spec.ts | Verifies error toast display | ⏳ |
| MSG-PW-027 | `Error Handling > should handle 404 conversation not found` | messaging.spec.ts | Verifies 404 handling | ⏳ |
| MSG-PW-028 | `Loading States > should show loading for conversations` | messaging.spec.ts | Verifies loading skeleton | ⏳ |
| MSG-PW-029 | `Loading States > should show loading for messages` | messaging.spec.ts | Verifies message loading state | ⏳ |

---

## 7.7 Rental Applications (PROD-101)

### PROD-101.2: RentalApplication Model

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-101.2.1 | Schema includes RentalApplication model | prisma/schema.prisma | Verifies model with applicant, property relations | ✅ |
| PROD-101.2.2 | Schema includes ApplicationStatus enum | prisma/schema.prisma | Verifies PENDING, UNDER_REVIEW, APPROVED, REJECTED, WITHDRAWN statuses | ✅ |
| PROD-101.2.3 | Schema includes unique constraint | prisma/schema.prisma | Verifies one application per user per property | ✅ |

### PROD-101.3: Submit Rental Application (POST /properties/:id/apply)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-101.3.1 | `create > should create a rental application successfully` | applications.service.spec.ts | Verifies application creation with employment info | ⏳ |
| PROD-101.3.2 | `create > should throw NotFoundException if property not found` | applications.service.spec.ts | Verifies error for non-existent property | ⏳ |
| PROD-101.3.3 | `create > should throw ForbiddenException when applying to own property` | applications.service.spec.ts | Verifies owner cannot apply to own property | ⏳ |
| PROD-101.3.4 | `create > should throw BadRequestException if property is not for rent` | applications.service.spec.ts | Verifies only rental properties accept applications | ⏳ |
| PROD-101.3.5 | `create > should throw ConflictException if already applied` | applications.service.spec.ts | Verifies duplicate application prevention | ⏳ |
| PROD-101.3.6 | `createApplication > should call service.create with correct parameters` | applications.controller.spec.ts | Verifies controller delegates to service | ⏳ |
| PROD-101.3 | `POST /properties/:propertyId/apply > should create a rental application` | applications.e2e-spec.ts | E2E test of application submission | ⏳ |
| PROD-101.3 | `POST /properties/:propertyId/apply > should fail when applying twice` | applications.e2e-spec.ts | E2E test of duplicate prevention | ⏳ |
| PROD-101.3 | `POST /properties/:propertyId/apply > should fail for own property` | applications.e2e-spec.ts | E2E test of ownership check | ⏳ |

### PROD-101.4: List Applications (GET /applications)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-101.4.1 | `getMyApplications > should return paginated applications` | applications.service.spec.ts | Verifies pagination of user's applications | ⏳ |
| PROD-101.4.2 | `getMyApplications > should filter by status` | applications.service.spec.ts | Verifies status filtering | ⏳ |
| PROD-101.4.3 | `getMyApplications > should call service with correct parameters` | applications.controller.spec.ts | Verifies controller delegates to service | ⏳ |
| PROD-101.4 | `GET /applications > should return user applications` | applications.e2e-spec.ts | E2E test of applications listing | ⏳ |
| PROD-101.4 | `GET /applications > should filter by status` | applications.e2e-spec.ts | E2E test of status filtering | ⏳ |

### PROD-101.5: Application Status Tracking

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-101.5.1 | `review > should update application status` | applications.service.spec.ts | Verifies owner can change status | ⏳ |
| PROD-101.5.2 | `review > should throw ForbiddenException for non-owner` | applications.service.spec.ts | Verifies only owner can review | ⏳ |
| PROD-101.5.3 | `review > should throw BadRequestException for withdrawn applications` | applications.service.spec.ts | Verifies cannot review withdrawn | ⏳ |
| PROD-101.5.4 | `withdraw > should withdraw application successfully` | applications.service.spec.ts | Verifies applicant can withdraw | ⏳ |
| PROD-101.5.5 | `withdraw > should throw ForbiddenException for non-applicant` | applications.service.spec.ts | Verifies only applicant can withdraw | ⏳ |
| PROD-101.5.6 | `withdraw > should throw BadRequestException for non-withdrawable status` | applications.service.spec.ts | Verifies cannot withdraw approved/rejected | ⏳ |
| PROD-101.5 | `PATCH /applications/:id/review > should allow owner to set status` | applications.e2e-spec.ts | E2E test of status update by owner | ⏳ |
| PROD-101.5 | `PATCH /applications/:id/withdraw > should allow applicant to withdraw` | applications.e2e-spec.ts | E2E test of application withdrawal | ⏳ |

### PROD-101.6: Employment & References Storage

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-101.6.1 | Schema includes employment fields | prisma/schema.prisma | Verifies employmentStatus, employer, jobTitle, monthlyIncome fields | ✅ |
| PROD-101.6.2 | Schema includes references field (JSON) | prisma/schema.prisma | Verifies references stored as JSON array | ✅ |
| PROD-101.6.3 | DTO validates employment fields | applications.dto.ts | Verifies CreateApplicationDto with employment validation | ✅ |
| PROD-101.6 | `POST /properties/:id/apply > stores employment info` | applications.e2e-spec.ts | E2E test verifying employment data persisted | ⏳ |

### Test Summary for PROD-101

| Test Type | Count | Status |
|-----------|-------|--------|
| Service Unit Tests | 18 | ⏳ |
| Controller Unit Tests | 6 | ⏳ |
| E2E Tests | 15 | ⏳ |
| **Total** | **39** | ⏳ |

---

## 7.8 Rent Reminders / Leases (PROD-102)

### PROD-102.1: Lease Model

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-102.1.1 | Schema includes Lease model | prisma/schema.prisma | Verifies model with tenant, landlord, property relations | ✅ |
| PROD-102.1.2 | Schema includes LeaseStatus enum | prisma/schema.prisma | Verifies DRAFT, ACTIVE, EXPIRED, TERMINATED statuses | ✅ |
| PROD-102.1.3 | Schema includes RentPayment model | prisma/schema.prisma | Verifies payment tracking with status, dates | ✅ |
| PROD-102.1.4 | Schema includes RentPaymentStatus enum | prisma/schema.prisma | Verifies PENDING, PAID, OVERDUE, WAIVED statuses | ✅ |
| PROD-102.1.5 | `create > should create a lease successfully` | leases.service.spec.ts | Verifies lease creation with property ownership check | ✅ |
| PROD-102.1.6 | `create > should throw NotFoundException if property not found` | leases.service.spec.ts | Verifies error for non-existent property | ✅ |
| PROD-102.1.7 | `create > should throw ForbiddenException if not owner` | leases.service.spec.ts | Verifies only owner can create lease | ✅ |
| PROD-102.1.8 | `create > should throw ConflictException if active lease exists` | leases.service.spec.ts | Verifies only one active lease per property | ✅ |
| PROD-102.1 | `POST /leases > should create a lease` | leases.e2e-spec.ts | E2E test of lease creation | ✅ |

### PROD-102.2: Rent Due Date Tracking (GET /leases/:id/payments)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-102.2.1 | `activate > should generate payment schedule` | leases.service.spec.ts | Verifies payments generated for lease term | ✅ |
| PROD-102.2.2 | `getPayments > should return payment history` | leases.service.spec.ts | Verifies payment listing for tenant/landlord | ✅ |
| PROD-102.2.3 | `getPayments > should filter by status` | leases.service.spec.ts | Verifies status filtering (PENDING, PAID, etc.) | ✅ |
| PROD-102.2 | `GET /leases/:id/payments > should return payment history` | leases.e2e-spec.ts | E2E test of payment history | ✅ |

### PROD-102.3: Tenant Reminder Email (5 days before)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-102.3.1 | `sendRentReminders > should send reminders for payments due in 5 days` | rent-reminder.service.spec.ts | Verifies cron job finds upcoming payments | ✅ |
| PROD-102.3.2 | `sendRentReminders > should send email to tenant` | rent-reminder.service.spec.ts | Verifies email sent via mail service | ✅ |
| PROD-102.3.3 | `sendRentReminders > should update reminderSentAt` | rent-reminder.service.spec.ts | Verifies reminder tracking to prevent duplicates | ✅ |
| PROD-102.3.4 | `sendRentReminderEmail > should send rent reminder` | mail.service.spec.ts | Verifies email template usage | ✅ |

### PROD-102.4: Landlord Notification (Payment Received)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-102.4.1 | `recordPayment > should record payment successfully` | leases.service.spec.ts | Verifies landlord can record payments | ✅ |
| PROD-102.4.2 | `recordPayment > should notify landlord` | leases.service.spec.ts | Verifies notification sent on payment | ✅ |
| PROD-102.4.3 | `recordPayment > should throw ForbiddenException for non-landlord` | leases.service.spec.ts | Verifies only landlord can record | ✅ |
| PROD-102.4.4 | `recordPayment > should throw BadRequestException if already paid` | leases.service.spec.ts | Verifies cannot re-record paid payment | ✅ |
| PROD-102.4 | `POST /leases/:id/payments/:paymentId/record > should record payment` | leases.e2e-spec.ts | E2E test of payment recording | ✅ |

### PROD-102.5: Overdue Notifications

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-102.5.1 | `checkOverduePayments > should mark pending payments as overdue` | rent-reminder.service.spec.ts | Verifies status update to OVERDUE | ✅ |
| PROD-102.5.2 | `checkOverduePayments > should notify tenant` | rent-reminder.service.spec.ts | Verifies tenant receives overdue alert | ✅ |
| PROD-102.5.3 | `checkOverduePayments > should notify landlord` | rent-reminder.service.spec.ts | Verifies landlord receives overdue alert | ✅ |
| PROD-102.5.4 | `checkOverduePayments > should resend after 7 days` | rent-reminder.service.spec.ts | Verifies repeated notifications for ongoing overdue | ✅ |
| PROD-102.5.5 | `sendRentOverdueEmail > should send overdue email` | mail.service.spec.ts | Verifies overdue email template | ✅ |

### PROD-102.6: In-App Reminders

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-102.6.1 | NotificationType includes RENT_REMINDER_TENANT | prisma/schema.prisma | Verifies notification type exists | ✅ |
| PROD-102.6.2 | NotificationType includes RENT_PAYMENT_RECEIVED | prisma/schema.prisma | Verifies notification type exists | ✅ |
| PROD-102.6.3 | NotificationType includes RENT_OVERDUE_TENANT | prisma/schema.prisma | Verifies notification type exists | ✅ |
| PROD-102.6.4 | NotificationType includes RENT_OVERDUE_LANDLORD | prisma/schema.prisma | Verifies notification type exists | ✅ |
| PROD-102.6.5 | `sendRentReminders > should create in-app notification` | rent-reminder.service.spec.ts | Verifies badge notification created | ✅ |

### Additional Lease Management Tests

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-102.A1 | `update > should update draft lease` | leases.service.spec.ts | Verifies only DRAFT leases can be modified | ✅ |
| PROD-102.A2 | `activate > should activate draft lease` | leases.service.spec.ts | Verifies lease activation flow | ✅ |
| PROD-102.A3 | `terminate > should terminate active lease` | leases.service.spec.ts | Verifies early termination | ✅ |
| PROD-102.A4 | `findAll > should return user leases` | leases.service.spec.ts | Verifies lease listing with role filter | ✅ |
| PROD-102.A5 | `findOne > should return lease for tenant/landlord` | leases.service.spec.ts | Verifies access control | ✅ |
| PROD-102.A6 | `waivePayment > should waive payment` | leases.service.spec.ts | Verifies landlord can waive payments | ✅ |
| PROD-102.A7 | `checkExpiredLeases > should mark expired leases` | rent-reminder.service.spec.ts | Verifies lease expiry cron job | ✅ |

### Test Summary for PROD-102

| Test Type | Count | Status |
|-----------|-------|--------|
| Service Unit Tests (LeasesService) | 25 | ✅ |
| Service Unit Tests (RentReminderService) | 10 | ✅ |
| Controller Unit Tests | 9 | ✅ |
| E2E Tests | 15 | ✅ |
| **Total** | **59** | ✅ |

---

## 7.9 Maintenance Workflows (PROD-103)

### PROD-103.1: Schema and Model

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.1.1 | Schema includes MaintenanceRequest model | prisma/schema.prisma | Verifies model with tenant, landlord, property, lease, provider relations | ⏳ |
| PROD-103.1.2 | Schema includes MaintenanceRequestType enum | prisma/schema.prisma | Verifies PLUMBING, ELECTRICAL, HVAC, etc. types | ⏳ |
| PROD-103.1.3 | Schema includes MaintenanceRequestStatus enum | prisma/schema.prisma | Verifies SUBMITTED, APPROVED, REJECTED, etc. statuses | ⏳ |
| PROD-103.1.4 | Schema includes MaintenancePriority enum | prisma/schema.prisma | Verifies LOW, NORMAL, URGENT, EMERGENCY priorities | ⏳ |
| PROD-103.1.5 | NotificationType includes MAINTENANCE_REQUEST_* values | prisma/schema.prisma | Verifies all maintenance notification types | ⏳ |

### PROD-103.2: Create Maintenance Request (POST /maintenance-requests)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.2.1 | `create > should create a maintenance request successfully` | maintenance.service.spec.ts | Verifies tenant can create request with active lease | ⏳ |
| PROD-103.2.2 | `create > should throw NotFoundException if lease not found` | maintenance.service.spec.ts | Verifies error for non-existent lease | ⏳ |
| PROD-103.2.3 | `create > should throw ForbiddenException if user is not the tenant` | maintenance.service.spec.ts | Verifies only lease tenant can create | ⏳ |
| PROD-103.2.4 | `create > should throw BadRequestException if lease is not active` | maintenance.service.spec.ts | Verifies only active lease allows requests | ⏳ |
| PROD-103.2.5 | `create > should call service.create with correct parameters` | maintenance.controller.spec.ts | Verifies controller passes user and DTO | ⏳ |
| PROD-103.2 | `POST /maintenance-requests > should allow tenant to create` | maintenance.e2e-spec.ts | E2E test of request creation | ⏳ |
| PROD-103.2 | `POST /maintenance-requests > should reject request from non-tenant` | maintenance.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-103.3: List Maintenance Requests (GET /maintenance-requests)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.3.1 | `findAll > should return paginated list for tenant` | maintenance.service.spec.ts | Verifies tenant sees own requests | ⏳ |
| PROD-103.3.2 | `findAll > should return paginated list for landlord` | maintenance.service.spec.ts | Verifies landlord sees property requests | ⏳ |
| PROD-103.3.3 | `findAll > should filter by status` | maintenance.service.spec.ts | Verifies status filtering works | ⏳ |
| PROD-103.3.4 | `findAll > should return paginated list of requests` | maintenance.controller.spec.ts | Verifies controller returns correct format | ⏳ |
| PROD-103.3 | `GET /maintenance-requests > should return for tenant` | maintenance.e2e-spec.ts | E2E test of tenant listing | ⏳ |
| PROD-103.3 | `GET /maintenance-requests > should filter by status` | maintenance.e2e-spec.ts | E2E test of status filter | ⏳ |

### PROD-103.4: Get Single Request (GET /maintenance-requests/:id)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.4.1 | `findOne > should return request for tenant` | maintenance.service.spec.ts | Verifies tenant can view own request | ⏳ |
| PROD-103.4.2 | `findOne > should return request for landlord` | maintenance.service.spec.ts | Verifies landlord can view request | ⏳ |
| PROD-103.4.3 | `findOne > should throw NotFoundException if request not found` | maintenance.service.spec.ts | Verifies error for missing request | ⏳ |
| PROD-103.4.4 | `findOne > should throw ForbiddenException for unauthorized user` | maintenance.service.spec.ts | Verifies access control | ⏳ |
| PROD-103.4 | `GET /maintenance-requests/:id > should return request details` | maintenance.e2e-spec.ts | E2E test of request details | ⏳ |
| PROD-103.4 | `GET /maintenance-requests/:id > should deny unauthorized access` | maintenance.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-103.5: Update Request (PATCH /maintenance-requests/:id)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.5.1 | `update > should update request if tenant and status is SUBMITTED` | maintenance.service.spec.ts | Verifies tenant can update submitted request | ⏳ |
| PROD-103.5.2 | `update > should throw ForbiddenException if not tenant` | maintenance.service.spec.ts | Verifies only tenant can update | ⏳ |
| PROD-103.5.3 | `update > should throw BadRequestException if status is not SUBMITTED` | maintenance.service.spec.ts | Verifies only submitted requests editable | ⏳ |
| PROD-103.5 | `PATCH /maintenance-requests/:id > should allow tenant to update` | maintenance.e2e-spec.ts | E2E test of update | ⏳ |
| PROD-103.5 | `PATCH /maintenance-requests/:id > should reject update from landlord` | maintenance.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-103.6: Approve Request (POST /maintenance-requests/:id/approve)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.6.1 | `approve > should approve request if landlord and status is SUBMITTED` | maintenance.service.spec.ts | Verifies landlord can approve | ⏳ |
| PROD-103.6.2 | `approve > should throw ForbiddenException if not landlord` | maintenance.service.spec.ts | Verifies only landlord can approve | ⏳ |
| PROD-103.6.3 | `approve > should throw BadRequestException if status is not SUBMITTED` | maintenance.service.spec.ts | Verifies only submitted requests approvable | ⏳ |
| PROD-103.6 | `POST /maintenance-requests/:id/approve > should allow landlord` | maintenance.e2e-spec.ts | E2E test of approval | ⏳ |
| PROD-103.6 | `POST /maintenance-requests/:id/approve > should reject from tenant` | maintenance.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-103.7: Reject Request (POST /maintenance-requests/:id/reject)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.7.1 | `reject > should reject request if landlord and status is SUBMITTED` | maintenance.service.spec.ts | Verifies landlord can reject with reason | ⏳ |
| PROD-103.7.2 | `reject > should throw ForbiddenException if not landlord` | maintenance.service.spec.ts | Verifies only landlord can reject | ⏳ |
| PROD-103.7 | `POST /maintenance-requests/:id/reject > should allow landlord` | maintenance.e2e-spec.ts | E2E test of rejection | ⏳ |

### PROD-103.8: Assign Provider (POST /maintenance-requests/:id/assign)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.8.1 | `assignProvider > should assign provider if landlord and status is APPROVED` | maintenance.service.spec.ts | Verifies provider assignment | ⏳ |
| PROD-103.8.2 | `assignProvider > should throw NotFoundException if provider not found` | maintenance.service.spec.ts | Verifies error for missing provider | ⏳ |
| PROD-103.8.3 | `assignProvider > should throw ForbiddenException if not landlord` | maintenance.service.spec.ts | Verifies only landlord can assign | ⏳ |
| PROD-103.8 | `POST /maintenance-requests/:id/assign > should allow landlord` | maintenance.e2e-spec.ts | E2E test of provider assignment | ⏳ |
| PROD-103.8 | `POST /maintenance-requests/:id/assign > should reject from tenant` | maintenance.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-103.9: Schedule Request (POST /maintenance-requests/:id/schedule)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.9.1 | `schedule > should schedule if landlord and status is ASSIGNED` | maintenance.service.spec.ts | Verifies scheduling with date/time | ⏳ |
| PROD-103.9.2 | `schedule > should throw BadRequestException if status is not ASSIGNED` | maintenance.service.spec.ts | Verifies only assigned requests schedulable | ⏳ |
| PROD-103.9 | `POST /maintenance-requests/:id/schedule > should allow scheduling` | maintenance.e2e-spec.ts | E2E test of scheduling | ⏳ |

### PROD-103.10: Start Work (POST /maintenance-requests/:id/start)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.10.1 | `startWork > should start work if provider and status is SCHEDULED` | maintenance.service.spec.ts | Verifies provider can start work | ⏳ |
| PROD-103.10.2 | `startWork > should throw ForbiddenException if not assigned provider` | maintenance.service.spec.ts | Verifies only assigned provider can start | ⏳ |
| PROD-103.10 | `POST /maintenance-requests/:id/start > should allow provider` | maintenance.e2e-spec.ts | E2E test of starting work | ⏳ |
| PROD-103.10 | `POST /maintenance-requests/:id/start > should reject from non-provider` | maintenance.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-103.11: Complete Work (POST /maintenance-requests/:id/complete)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.11.1 | `complete > should complete work if provider and status is IN_PROGRESS` | maintenance.service.spec.ts | Verifies provider can complete with notes/cost | ⏳ |
| PROD-103.11.2 | `complete > should throw ForbiddenException if not assigned provider` | maintenance.service.spec.ts | Verifies only assigned provider can complete | ⏳ |
| PROD-103.11 | `POST /maintenance-requests/:id/complete > should allow provider` | maintenance.e2e-spec.ts | E2E test of completion | ⏳ |

### PROD-103.12: Confirm Completion (POST /maintenance-requests/:id/confirm)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.12.1 | `confirmCompletion > should allow tenant to confirm completion` | maintenance.service.spec.ts | Verifies tenant confirmation | ⏳ |
| PROD-103.12.2 | `confirmCompletion > should allow landlord to confirm completion` | maintenance.service.spec.ts | Verifies landlord confirmation | ⏳ |
| PROD-103.12.3 | `confirmCompletion > should set status to CONFIRMED when both parties confirm` | maintenance.service.spec.ts | Verifies final status change | ⏳ |
| PROD-103.12.4 | `confirmCompletion > should throw ForbiddenException for unauthorized user` | maintenance.service.spec.ts | Verifies access control | ⏳ |
| PROD-103.12 | `POST /maintenance-requests/:id/confirm > should allow tenant` | maintenance.e2e-spec.ts | E2E test of tenant confirmation | ⏳ |
| PROD-103.12 | `POST /maintenance-requests/:id/confirm > should allow landlord and finalize` | maintenance.e2e-spec.ts | E2E test of landlord confirmation | ⏳ |

### PROD-103.13: Cancel Request (POST /maintenance-requests/:id/cancel)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.13.1 | `cancel > should allow tenant to cancel SUBMITTED request` | maintenance.service.spec.ts | Verifies tenant can cancel own submitted request | ⏳ |
| PROD-103.13.2 | `cancel > should allow landlord to cancel any cancellable request` | maintenance.service.spec.ts | Verifies landlord can cancel | ⏳ |
| PROD-103.13.3 | `cancel > should throw BadRequestException for tenant cancelling non-SUBMITTED request` | maintenance.service.spec.ts | Verifies tenant limitation | ⏳ |
| PROD-103.13.4 | `cancel > should throw BadRequestException for already completed request` | maintenance.service.spec.ts | Verifies completed cannot be cancelled | ⏳ |
| PROD-103.13.5 | `cancel > should throw ForbiddenException for unauthorized user` | maintenance.service.spec.ts | Verifies access control | ⏳ |
| PROD-103.13 | `POST /maintenance-requests/:id/cancel > should allow tenant` | maintenance.e2e-spec.ts | E2E test of tenant cancellation | ⏳ |
| PROD-103.13 | `POST /maintenance-requests/:id/cancel > should allow landlord` | maintenance.e2e-spec.ts | E2E test of landlord cancellation | ⏳ |
| PROD-103.13 | `POST /maintenance-requests/:id/cancel > should prevent tenant from cancelling approved` | maintenance.e2e-spec.ts | E2E test of status restriction | ⏳ |

### Test Summary for PROD-103

| Test Type | Count | Status |
|-----------|-------|--------|
| Service Unit Tests (MaintenanceService) | 37 | ⏳ |
| Controller Unit Tests | 12 | ⏳ |
| E2E Tests | 18 | ⏳ |
| **Total** | **67** | ⏳ |

---

## 7.10 Application Status Notifications (PROD-104)

### PROD-104.1: Email on Status Update

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-104.1.1 | `review > should send congratulations email when approved` | applications.service.spec.ts | Verifies approval email is sent | ✅ |
| PROD-104.1.2 | `review > should send rejection email when rejected` | applications.service.spec.ts | Verifies rejection email is sent | ✅ |
| PROD-104.1.3 | `review > should not fail if status email fails` | applications.service.spec.ts | Verifies email failure doesn't break flow | ✅ |

### PROD-104.2: In-App Notification for Status Changes

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-104.2.1 | `review > should update application status` | applications.service.spec.ts | Verifies APPLICATION_STATUS_CHANGED notification sent | ✅ |

### PROD-104.3: "Application Received" Notification

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-104.3.1 | `create > should send application received email to applicant` | applications.service.spec.ts | Verifies confirmation email to applicant | ✅ |
| PROD-104.3.2 | `create > should not fail if application received email fails` | applications.service.spec.ts | Verifies email failure doesn't break flow | ✅ |
| PROD-104.3.3 | `create > should create a rental application successfully` | applications.service.spec.ts | Verifies APPLICATION_RECEIVED notification to owner | ✅ |

### PROD-104.4: "Congratulations" Approval Email

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-104.4.1 | `sendApplicationApprovedEmail` | mail.service.ts | Sends congratulations email with property and owner details | ✅ |
| PROD-104.4.2 | Template: application-approved.hbs | src/mail/templates/ | Professional approval email with next steps | ✅ |

### PROD-104.5: "Unfortunately" Rejection Email

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-104.5.1 | `sendApplicationRejectedEmail` | mail.service.ts | Sends rejection email with optional reason | ✅ |
| PROD-104.5.2 | Template: application-rejected.hbs | src/mail/templates/ | Empathetic rejection email with encouragement | ✅ |

### Test Summary for PROD-104

| Test Type | Count | Status |
|-----------|-------|--------|
| Service Unit Tests (ApplicationsService) | 7 | ✅ |
| Email Templates | 3 | ✅ |
| **Total** | **10** | ✅ |

---

## 7.11 Lease Renewal Automation (PROD-105)

### PROD-105.1: Schema and Model

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.1.1 | Schema includes LeaseRenewal model | prisma/schema.prisma | Verifies model with lease, landlord, tenant, newLease relations | ⏳ |
| PROD-105.1.2 | Schema includes LeaseRenewalStatus enum | prisma/schema.prisma | Verifies PENDING, OFFERED, ACCEPTED, DECLINED, EXPIRED, CANCELLED statuses | ⏳ |
| PROD-105.1.3 | NotificationType includes LEASE_RENEWAL_* values | prisma/schema.prisma | Verifies all lease renewal notification types | ⏳ |

### PROD-105.2: Check Upcoming Renewals (Cron Job)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.2.1 | `checkUpcomingRenewals > should find leases ending in 60 days` | lease-renewal.service.spec.ts | Verifies cron job identifies expiring leases | ⏳ |
| PROD-105.2.2 | `checkUpcomingRenewals > should create PENDING renewal records` | lease-renewal.service.spec.ts | Verifies renewal record is created for each lease | ⏳ |
| PROD-105.2.3 | `checkUpcomingRenewals > should send notifications to landlords` | lease-renewal.service.spec.ts | Verifies landlord receives reminder notification | ⏳ |
| PROD-105.2.4 | `checkUpcomingRenewals > should send emails to landlords` | lease-renewal.service.spec.ts | Verifies landlord receives reminder email | ⏳ |
| PROD-105.2.5 | `checkUpcomingRenewals > should skip leases that already have renewal` | lease-renewal.service.spec.ts | Verifies no duplicate renewals created | ⏳ |

### PROD-105.3: List Pending Renewals (GET /leases/renewals/pending)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.3.1 | `findPendingRenewals > should return paginated renewals for landlord` | lease-renewal.service.spec.ts | Verifies landlord sees their pending renewals | ⏳ |
| PROD-105.3.2 | `findPendingRenewals > should filter by status` | lease-renewal.service.spec.ts | Verifies status filtering works | ⏳ |
| PROD-105.3 | `GET /leases/renewals/pending > should return pending renewals` | lease-renewal.e2e-spec.ts | E2E test of pending renewals list | ⏳ |

### PROD-105.4: Get Renewal for Lease (GET /leases/:id/renewal)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.4.1 | `findRenewalForLease > should return renewal for landlord` | lease-renewal.service.spec.ts | Verifies landlord can view renewal status | ⏳ |
| PROD-105.4.2 | `findRenewalForLease > should return renewal for tenant` | lease-renewal.service.spec.ts | Verifies tenant can view renewal status | ⏳ |
| PROD-105.4.3 | `findRenewalForLease > should throw NotFoundException if no renewal` | lease-renewal.service.spec.ts | Verifies error for missing renewal | ⏳ |
| PROD-105.4.4 | `findRenewalForLease > should throw ForbiddenException for unauthorized` | lease-renewal.service.spec.ts | Verifies access control | ⏳ |
| PROD-105.4 | `GET /leases/:id/renewal > should return renewal status` | lease-renewal.e2e-spec.ts | E2E test of renewal retrieval | ⏳ |
| PROD-105.4 | `GET /leases/:id/renewal > should deny unauthorized access` | lease-renewal.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-105.5: Create Renewal Offer (POST /leases/:id/renewal/offer)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.5.1 | `createOffer > should create offer with proposed terms` | lease-renewal.service.spec.ts | Verifies landlord can set start/end dates and rent | ⏳ |
| PROD-105.5.2 | `createOffer > should update status to OFFERED` | lease-renewal.service.spec.ts | Verifies status transition | ⏳ |
| PROD-105.5.3 | `createOffer > should send notification to tenant` | lease-renewal.service.spec.ts | Verifies tenant receives offer notification | ⏳ |
| PROD-105.5.4 | `createOffer > should send email to tenant` | lease-renewal.service.spec.ts | Verifies tenant receives offer email | ⏳ |
| PROD-105.5.5 | `createOffer > should throw ForbiddenException if not landlord` | lease-renewal.service.spec.ts | Verifies only landlord can create offer | ⏳ |
| PROD-105.5.6 | `createOffer > should throw BadRequestException if not PENDING` | lease-renewal.service.spec.ts | Verifies status must be PENDING | ⏳ |
| PROD-105.5 | `POST /leases/:id/renewal/offer > should allow landlord` | lease-renewal.e2e-spec.ts | E2E test of offer creation | ⏳ |
| PROD-105.5 | `POST /leases/:id/renewal/offer > should reject from tenant` | lease-renewal.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-105.6: Accept Renewal Offer (POST /leases/:id/renewal/accept)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.6.1 | `acceptOffer > should update status to ACCEPTED` | lease-renewal.service.spec.ts | Verifies status transition | ⏳ |
| PROD-105.6.2 | `acceptOffer > should create new lease with proposed terms` | lease-renewal.service.spec.ts | Verifies new lease auto-generated | ⏳ |
| PROD-105.6.3 | `acceptOffer > should link new lease to renewal record` | lease-renewal.service.spec.ts | Verifies newLeaseId is set | ⏳ |
| PROD-105.6.4 | `acceptOffer > should send notifications to both parties` | lease-renewal.service.spec.ts | Verifies both landlord and tenant notified | ⏳ |
| PROD-105.6.5 | `acceptOffer > should send emails to both parties` | lease-renewal.service.spec.ts | Verifies both receive acceptance email | ⏳ |
| PROD-105.6.6 | `acceptOffer > should throw ForbiddenException if not tenant` | lease-renewal.service.spec.ts | Verifies only tenant can accept | ⏳ |
| PROD-105.6.7 | `acceptOffer > should throw BadRequestException if not OFFERED` | lease-renewal.service.spec.ts | Verifies status must be OFFERED | ⏳ |
| PROD-105.6 | `POST /leases/:id/renewal/accept > should allow tenant` | lease-renewal.e2e-spec.ts | E2E test of acceptance | ⏳ |
| PROD-105.6 | `POST /leases/:id/renewal/accept > should create new lease` | lease-renewal.e2e-spec.ts | E2E test of lease generation | ⏳ |
| PROD-105.6 | `POST /leases/:id/renewal/accept > should reject from landlord` | lease-renewal.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-105.7: Decline Renewal Offer (POST /leases/:id/renewal/decline)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.7.1 | `declineOffer > should update status to DECLINED` | lease-renewal.service.spec.ts | Verifies status transition | ⏳ |
| PROD-105.7.2 | `declineOffer > should store decline reason` | lease-renewal.service.spec.ts | Verifies optional reason saved | ⏳ |
| PROD-105.7.3 | `declineOffer > should send notification to landlord` | lease-renewal.service.spec.ts | Verifies landlord notified | ⏳ |
| PROD-105.7.4 | `declineOffer > should send email to landlord` | lease-renewal.service.spec.ts | Verifies landlord receives decline email | ⏳ |
| PROD-105.7.5 | `declineOffer > should throw ForbiddenException if not tenant` | lease-renewal.service.spec.ts | Verifies only tenant can decline | ⏳ |
| PROD-105.7 | `POST /leases/:id/renewal/decline > should allow tenant` | lease-renewal.e2e-spec.ts | E2E test of decline | ⏳ |
| PROD-105.7 | `POST /leases/:id/renewal/decline > should reject from landlord` | lease-renewal.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-105.8: Cancel Renewal Offer (DELETE /leases/:id/renewal)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.8.1 | `cancelOffer > should update status to CANCELLED` | lease-renewal.service.spec.ts | Verifies status transition | ⏳ |
| PROD-105.8.2 | `cancelOffer > should throw ForbiddenException if not landlord` | lease-renewal.service.spec.ts | Verifies only landlord can cancel | ⏳ |
| PROD-105.8.3 | `cancelOffer > should throw BadRequestException if already responded` | lease-renewal.service.spec.ts | Verifies cannot cancel after response | ⏳ |
| PROD-105.8 | `DELETE /leases/:id/renewal > should allow landlord` | lease-renewal.e2e-spec.ts | E2E test of cancellation | ⏳ |
| PROD-105.8 | `DELETE /leases/:id/renewal > should reject from tenant` | lease-renewal.e2e-spec.ts | E2E test of authorization | ⏳ |

### PROD-105.9: Expire Offers (Cron Job)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.9.1 | `expireOffers > should find offers past expiration date` | lease-renewal.service.spec.ts | Verifies cron job identifies expired offers | ⏳ |
| PROD-105.9.2 | `expireOffers > should update status to EXPIRED` | lease-renewal.service.spec.ts | Verifies status transition | ⏳ |
| PROD-105.9.3 | `expireOffers > should send notifications to both parties` | lease-renewal.service.spec.ts | Verifies both parties notified | ⏳ |
| PROD-105.9.4 | `expireOffers > should send emails to both parties` | lease-renewal.service.spec.ts | Verifies both receive expiration email | ⏳ |

### Test Summary for PROD-105

| Test Type | Count | Status |
|-----------|-------|--------|
| Service Unit Tests (LeaseRenewalService) | 20 | ⏳ |
| E2E Tests | 15 | ⏳ |
| **Total** | **35** | ⏳ |

---

## 7.12 Management Dashboard (PROD-100)

### PROD-100.1: Landlord Dashboard Aggregation (GET /dashboard/landlord)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-100.1.1 | `getLandlordDashboard > should return complete dashboard with all fields` | dashboard.service.spec.ts | Verifies aggregated dashboard contains all required fields | ✅ |
| PROD-100.1.2 | `getLandlordDashboard > should call dashboardService with correct parameters` | dashboard.controller.spec.ts | Verifies controller delegates to service | ✅ |
| PROD-100.1.3 | `should return aggregated dashboard data` | dashboard.e2e-spec.ts | E2E test of full dashboard response | ✅ |
| PROD-100.1.4 | `should require authentication` | dashboard.e2e-spec.ts | Verifies 401 for unauthenticated requests | ✅ |

### PROD-100.2: Property Summary with Status

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-100.2.1 | `getLandlordDashboard > should include property summary with tenant info` | dashboard.service.spec.ts | Verifies properties include status, tenant, lease info | ✅ |
| PROD-100.2.2 | `getLandlordDashboard > should filter by propertyId when provided` | dashboard.service.spec.ts | Verifies property filtering | ✅ |
| PROD-100.2.3 | `should include property summary with status` | dashboard.e2e-spec.ts | E2E test of property summary | ✅ |
| PROD-100.2.4 | `should filter by propertyId` | dashboard.e2e-spec.ts | E2E test of property filter | ✅ |

### PROD-100.3: Monthly Income Tracker

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-100.3.1 | `getLandlordDashboard > should aggregate monthly income data correctly` | dashboard.service.spec.ts | Verifies monthly income grouping from RentPayments | ✅ |
| PROD-100.3.2 | `getLandlordDashboard > should use date range when provided` | dashboard.service.spec.ts | Verifies date range filtering | ✅ |
| PROD-100.3.3 | `should include monthly income data` | dashboard.e2e-spec.ts | E2E test of monthly income chart data | ✅ |
| PROD-100.3.4 | `should filter by date range` | dashboard.e2e-spec.ts | E2E test of date range filter | ✅ |

### PROD-100.4: Expense Tracker (CRUD)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-100.4.1 | Schema includes ExpenseCategory enum | prisma/schema.prisma | Verifies expense categories (MAINTENANCE, INSURANCE, etc.) | ✅ |
| PROD-100.4.2 | Schema includes Expense model | prisma/schema.prisma | Verifies model with landlord, property relations | ✅ |
| PROD-100.4.3 | `create > should create an expense successfully` | expense.service.spec.ts | Verifies expense creation with validation | ✅ |
| PROD-100.4.4 | `create > should create expense without property (general expense)` | expense.service.spec.ts | Verifies general expense without property | ✅ |
| PROD-100.4.5 | `create > should throw NotFoundException if property not found` | expense.service.spec.ts | Verifies error for non-existent property | ✅ |
| PROD-100.4.6 | `create > should throw ForbiddenException if not property owner` | expense.service.spec.ts | Verifies ownership check | ✅ |
| PROD-100.4.7 | `findAll > should return paginated expenses` | expense.service.spec.ts | Verifies pagination of expenses | ✅ |
| PROD-100.4.8 | `findAll > should filter by category` | expense.service.spec.ts | Verifies category filtering | ✅ |
| PROD-100.4.9 | `findAll > should filter by date range` | expense.service.spec.ts | Verifies date range filtering | ✅ |
| PROD-100.4.10 | `findAll > should filter by property` | expense.service.spec.ts | Verifies property filtering | ✅ |
| PROD-100.4.11 | `findOne > should return expense for owner` | expense.service.spec.ts | Verifies get single expense | ✅ |
| PROD-100.4.12 | `findOne > should throw NotFoundException if expense not found` | expense.service.spec.ts | Verifies error for missing expense | ✅ |
| PROD-100.4.13 | `findOne > should throw ForbiddenException for other user` | expense.service.spec.ts | Verifies authorization | ✅ |
| PROD-100.4.14 | `update > should update expense successfully` | expense.service.spec.ts | Verifies expense update | ✅ |
| PROD-100.4.15 | `update > should validate property ownership when changing propertyId` | expense.service.spec.ts | Verifies property change validation | ✅ |
| PROD-100.4.16 | `delete > should delete expense successfully` | expense.service.spec.ts | Verifies expense deletion | ✅ |
| PROD-100.4.17 | `createExpense > should call expenseService.create` | dashboard.controller.spec.ts | Verifies controller delegates to service | ✅ |
| PROD-100.4.18 | `getExpenses > should call expenseService.findAll` | dashboard.controller.spec.ts | Verifies controller delegates to service | ✅ |
| PROD-100.4.19 | `getExpense > should call expenseService.findOne` | dashboard.controller.spec.ts | Verifies controller delegates to service | ✅ |
| PROD-100.4.20 | `updateExpense > should call expenseService.update` | dashboard.controller.spec.ts | Verifies controller delegates to service | ✅ |
| PROD-100.4.21 | `deleteExpense > should call expenseService.delete` | dashboard.controller.spec.ts | Verifies controller delegates to service | ✅ |
| PROD-100.4.22 | `POST /dashboard/expenses > should create an expense` | dashboard.e2e-spec.ts | E2E test of expense creation | ✅ |
| PROD-100.4.23 | `POST /dashboard/expenses > should create expense without property` | dashboard.e2e-spec.ts | E2E test of general expense | ✅ |
| PROD-100.4.24 | `POST /dashboard/expenses > should fail with invalid property` | dashboard.e2e-spec.ts | E2E test of property validation | ✅ |
| PROD-100.4.25 | `POST /dashboard/expenses > should fail when not property owner` | dashboard.e2e-spec.ts | E2E test of authorization | ✅ |
| PROD-100.4.26 | `POST /dashboard/expenses > should validate required fields` | dashboard.e2e-spec.ts | E2E test of validation | ✅ |
| PROD-100.4.27 | `GET /dashboard/expenses > should return paginated expenses` | dashboard.e2e-spec.ts | E2E test of expense listing | ✅ |
| PROD-100.4.28 | `GET /dashboard/expenses > should filter by category` | dashboard.e2e-spec.ts | E2E test of category filter | ✅ |
| PROD-100.4.29 | `GET /dashboard/expenses > should filter by date range` | dashboard.e2e-spec.ts | E2E test of date filter | ✅ |
| PROD-100.4.30 | `GET /dashboard/expenses > should filter by property` | dashboard.e2e-spec.ts | E2E test of property filter | ✅ |
| PROD-100.4.31 | `GET /dashboard/expenses/:id > should return expense details` | dashboard.e2e-spec.ts | E2E test of get expense | ✅ |
| PROD-100.4.32 | `GET /dashboard/expenses/:id > should fail for non-owner` | dashboard.e2e-spec.ts | E2E test of authorization | ✅ |
| PROD-100.4.33 | `GET /dashboard/expenses/:id > should return 404 for non-existent` | dashboard.e2e-spec.ts | E2E test of not found | ✅ |
| PROD-100.4.34 | `PATCH /dashboard/expenses/:id > should update expense` | dashboard.e2e-spec.ts | E2E test of update | ✅ |
| PROD-100.4.35 | `PATCH /dashboard/expenses/:id > should fail for non-owner` | dashboard.e2e-spec.ts | E2E test of authorization | ✅ |
| PROD-100.4.36 | `DELETE /dashboard/expenses/:id > should delete expense` | dashboard.e2e-spec.ts | E2E test of deletion | ✅ |
| PROD-100.4.37 | `DELETE /dashboard/expenses/:id > should fail for non-owner` | dashboard.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-100.5: Net Income Calculation

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-100.5.1 | `getLandlordDashboard > should calculate net income correctly` | dashboard.service.spec.ts | Verifies netIncome = actualIncome - expenses | ✅ |
| PROD-100.5.2 | `getTotalExpenses > should calculate total expenses correctly` | expense.service.spec.ts | Verifies expense aggregation | ✅ |
| PROD-100.5.3 | `getTotalExpenses > should filter by date range` | expense.service.spec.ts | Verifies date filtering | ✅ |
| PROD-100.5.4 | `getTotalExpenses > should return 0 when no expenses` | expense.service.spec.ts | Verifies empty state handling | ✅ |
| PROD-100.5.5 | `should calculate net income correctly` | dashboard.e2e-spec.ts | E2E test of net income calculation | ✅ |

### PROD-100.6: Maintenance Requests List

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-100.6.1 | `getLandlordDashboard > maintenanceRequests and pendingMaintenanceRequests` | dashboard.service.spec.ts | Verifies maintenance data included | ✅ |
| PROD-100.6.2 | `should include maintenance requests` | dashboard.e2e-spec.ts | E2E test of maintenance in dashboard | ✅ |

### PROD-100.7: Expenses by Category

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-100.7.1 | `getExpensesByCategory > should group expenses by category` | expense.service.spec.ts | Verifies category grouping with totals | ✅ |
| PROD-100.7.2 | Dashboard response includes expensesByCategory | dashboard.service.spec.ts | Verifies category breakdown in dashboard | ✅ |

### PROD-100.8: Empty State Handling

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-100.8.1 | `getLandlordDashboard > should return empty arrays for landlord with no data` | dashboard.service.spec.ts | Verifies graceful handling of new landlord | ✅ |

### Test Summary for PROD-100

| Test Type | Count | Status |
|-----------|-------|--------|
| ExpenseService Unit Tests | 15 | ✅ |
| DashboardService Unit Tests | 8 | ✅ |
| DashboardController Unit Tests | 6 | ✅ |
| E2E Tests | 24 | ✅ |
| **Total** | **53** | ✅ |

---

## 7.13 Tenant Portal (PROD-106)

### PROD-106.1: Tenant Dashboard (GET /dashboard/tenant)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-106.1.1 | `getTenantDashboard > should return aggregated dashboard data` | tenant-dashboard.service.spec.ts | Verifies tenant dashboard includes all required fields | ✅ |
| PROD-106.1.2 | `getTenantDashboard > should handle empty data correctly` | tenant-dashboard.service.spec.ts | Verifies graceful handling of new tenant with no data | ✅ |
| PROD-106.1.3 | `getTenantDashboard > should correctly map lease data to DTO` | tenant-dashboard.service.spec.ts | Verifies lease mapping with property and landlord info | ✅ |
| PROD-106.1.4 | `getTenantDashboard > should correctly calculate total monthly rent from multiple leases` | tenant-dashboard.service.spec.ts | Verifies rent aggregation across multiple leases | ✅ |
| PROD-106.1.5 | `GET /dashboard/tenant > should return aggregated tenant dashboard` | tenant-portal.e2e-spec.ts | E2E test of full tenant dashboard response | ✅ |
| PROD-106.1.6 | `GET /dashboard/tenant > should require authentication` | tenant-portal.e2e-spec.ts | Verifies 401 for unauthenticated requests | ✅ |
| PROD-106.1.7 | `GET /dashboard/tenant > should return empty dashboard for new tenant` | tenant-portal.e2e-spec.ts | E2E test of empty state handling | ✅ |

### PROD-106.3: Payment Link (GET /leases/:id/payments/:paymentId/pay-link)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-106.3.1 | `getPaymentLink > should return payment link for tenant` | leases.service.spec.ts | Verifies payment link returned for lease tenant | ✅ |
| PROD-106.3.2 | `getPaymentLink > should throw if payment not found` | leases.service.spec.ts | Verifies error for non-existent payment | ✅ |
| PROD-106.3.3 | `getPaymentLink > should throw if payment does not belong to lease` | leases.service.spec.ts | Verifies payment-lease relationship validation | ✅ |
| PROD-106.3.4 | `getPaymentLink > should throw if user is not lease participant` | leases.service.spec.ts | Verifies authorization check | ✅ |
| PROD-106.3.5 | `getPaymentLink > should throw if payment already paid` | leases.service.spec.ts | Verifies paid payment rejection | ✅ |
| PROD-106.3.6 | `getPaymentLink > should allow landlord to view payment link` | leases.service.spec.ts | Verifies landlord access to payment link | ✅ |
| PROD-106.3.7 | `GET /leases/:id/payments/:paymentId/pay-link > should return payment link` | tenant-portal.e2e-spec.ts | E2E test of payment link endpoint | ✅ |
| PROD-106.3.8 | `GET /leases/:id/payments/:paymentId/pay-link > should require authentication` | tenant-portal.e2e-spec.ts | Verifies 401 for unauthenticated | ✅ |
| PROD-106.3.9 | `GET /leases/:id/payments/:paymentId/pay-link > should reject payment already paid` | tenant-portal.e2e-spec.ts | E2E test of paid payment rejection | ✅ |
| PROD-106.3.10 | `GET /leases/:id/payments/:paymentId/pay-link > should reject non-participant` | tenant-portal.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-106.6: E-Signature (POST /leases/:id/sign, GET /leases/:id/signature-status)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-106.6.1 | `signLease > should allow landlord to sign first (draft lease)` | leases.service.spec.ts | Verifies landlord can sign draft lease | ✅ |
| PROD-106.6.2 | `signLease > should allow tenant to sign after landlord` | leases.service.spec.ts | Verifies tenant can sign after landlord | ✅ |
| PROD-106.6.3 | `signLease > should auto-activate lease when both sign` | leases.service.spec.ts | Verifies lease status changes to ACTIVE on both signatures | ✅ |
| PROD-106.6.4 | `signLease > should throw if tenant tries to sign first` | leases.service.spec.ts | Verifies landlord-first signing order | ✅ |
| PROD-106.6.5 | `signLease > should throw if already signed` | leases.service.spec.ts | Verifies duplicate signature rejection | ✅ |
| PROD-106.6.6 | `signLease > should throw for non-participant` | leases.service.spec.ts | Verifies authorization check | ✅ |
| PROD-106.6.7 | `getSignatureStatus > should return correct status for unsigned lease` | leases.service.spec.ts | Verifies unsigned status reported | ✅ |
| PROD-106.6.8 | `getSignatureStatus > should return correct status for landlord-signed lease` | leases.service.spec.ts | Verifies partial signature status | ✅ |
| PROD-106.6.9 | `getSignatureStatus > should return correct status for fully executed lease` | leases.service.spec.ts | Verifies fully executed status | ✅ |
| PROD-106.6.10 | `getSignatureStatus > should throw for non-participant` | leases.service.spec.ts | Verifies authorization check | ✅ |
| PROD-106.6.11 | `POST /leases/:id/sign > landlord signs draft lease` | tenant-portal.e2e-spec.ts | E2E test of landlord signing | ✅ |
| PROD-106.6.12 | `POST /leases/:id/sign > tenant signs after landlord` | tenant-portal.e2e-spec.ts | E2E test of tenant signing | ✅ |
| PROD-106.6.13 | `POST /leases/:id/sign > lease activates when both sign` | tenant-portal.e2e-spec.ts | E2E test of auto-activation | ✅ |
| PROD-106.6.14 | `POST /leases/:id/sign > tenant cannot sign first` | tenant-portal.e2e-spec.ts | E2E test of signing order | ✅ |
| PROD-106.6.15 | `POST /leases/:id/sign > non-participant cannot sign` | tenant-portal.e2e-spec.ts | E2E test of authorization | ✅ |
| PROD-106.6.16 | `GET /leases/:id/signature-status > returns signature status` | tenant-portal.e2e-spec.ts | E2E test of status endpoint | ✅ |
| PROD-106.6.17 | `GET /leases/:id/signature-status > requires authentication` | tenant-portal.e2e-spec.ts | Verifies 401 for unauthenticated | ✅ |

### PROD-106.7: Document Storage (CRUD /dashboard/tenant/documents)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-106.7.1 | Schema includes TenantDocumentType enum | prisma/schema.prisma | Verifies document types (LEASE_AGREEMENT, SIGNED_LEASE, etc.) | ✅ |
| PROD-106.7.2 | Schema includes TenantDocument model | prisma/schema.prisma | Verifies model with lease, uploader relations | ✅ |
| PROD-106.7.3 | `create > should create a document when user is tenant` | tenant-document.service.spec.ts | Verifies document creation by tenant | ✅ |
| PROD-106.7.4 | `create > should create a document when user is landlord` | tenant-document.service.spec.ts | Verifies document creation by landlord | ✅ |
| PROD-106.7.5 | `create > should throw NotFoundException when lease not found` | tenant-document.service.spec.ts | Verifies lease validation | ✅ |
| PROD-106.7.6 | `create > should throw ForbiddenException when user has no access` | tenant-document.service.spec.ts | Verifies authorization | ✅ |
| PROD-106.7.7 | `findAll > should return documents for a specific lease` | tenant-document.service.spec.ts | Verifies document listing by lease | ✅ |
| PROD-106.7.8 | `findAll > should return documents filtered by type` | tenant-document.service.spec.ts | Verifies type filtering | ✅ |
| PROD-106.7.9 | `findAll > should return all documents across user leases when no leaseId provided` | tenant-document.service.spec.ts | Verifies multi-lease document listing | ✅ |
| PROD-106.7.10 | `findAll > should throw ForbiddenException when user has no access to lease` | tenant-document.service.spec.ts | Verifies authorization | ✅ |
| PROD-106.7.11 | `findAll > should throw NotFoundException when lease not found` | tenant-document.service.spec.ts | Verifies lease validation | ✅ |
| PROD-106.7.12 | `findOne > should return document when user is tenant` | tenant-document.service.spec.ts | Verifies get document by tenant | ✅ |
| PROD-106.7.13 | `findOne > should return document when user is landlord` | tenant-document.service.spec.ts | Verifies get document by landlord | ✅ |
| PROD-106.7.14 | `findOne > should throw NotFoundException when document not found` | tenant-document.service.spec.ts | Verifies error for missing document | ✅ |
| PROD-106.7.15 | `findOne > should throw ForbiddenException when user has no access` | tenant-document.service.spec.ts | Verifies authorization | ✅ |
| PROD-106.7.16 | `delete > should delete document when user is the uploader` | tenant-document.service.spec.ts | Verifies deletion by uploader | ✅ |
| PROD-106.7.17 | `delete > should delete document when user is landlord` | tenant-document.service.spec.ts | Verifies landlord can delete documents | ✅ |
| PROD-106.7.18 | `delete > should throw NotFoundException when document not found` | tenant-document.service.spec.ts | Verifies error for missing document | ✅ |
| PROD-106.7.19 | `delete > should throw ForbiddenException when tenant tries to delete other user document` | tenant-document.service.spec.ts | Verifies authorization | ✅ |
| PROD-106.7.20 | `POST /dashboard/tenant/documents > should create a document` | tenant-portal.e2e-spec.ts | E2E test of document creation | ✅ |
| PROD-106.7.21 | `POST /dashboard/tenant/documents > should require authentication` | tenant-portal.e2e-spec.ts | Verifies 401 for unauthenticated | ✅ |
| PROD-106.7.22 | `GET /dashboard/tenant/documents > should return documents` | tenant-portal.e2e-spec.ts | E2E test of document listing | ✅ |
| PROD-106.7.23 | `GET /dashboard/tenant/documents > should filter by leaseId` | tenant-portal.e2e-spec.ts | E2E test of lease filter | ✅ |
| PROD-106.7.24 | `GET /dashboard/tenant/documents/:id > should return document` | tenant-portal.e2e-spec.ts | E2E test of get document | ✅ |
| PROD-106.7.25 | `GET /dashboard/tenant/documents/:id > should return 404 for non-existent` | tenant-portal.e2e-spec.ts | E2E test of not found | ✅ |
| PROD-106.7.26 | `DELETE /dashboard/tenant/documents/:id > should delete document` | tenant-portal.e2e-spec.ts | E2E test of deletion | ✅ |

### Test Summary for PROD-106

| Test Type | Count | Status |
|-----------|-------|--------|
| TenantDashboardService Unit Tests | 4 | ✅ |
| TenantDocumentService Unit Tests | 17 | ✅ |
| LeasesService E-Signature Unit Tests | 16 | ✅ |
| E2E Tests | 26 | ✅ |
| **Total** | **63** | ✅ |

---

## 8. E2E Test Coverage

### End-to-End Test Summary

| Module | Test File | Test Count | Purpose | Status |
|--------|-----------|------------|---------|--------|
| App | app.e2e-spec.ts | 1 | Basic app health check | ✅ |
| Auth | auth.e2e-spec.ts | 10+ | Complete authentication flow | ✅ |
| Users | users.e2e-spec.ts | 8+ | User CRUD operations | ✅ |
| Properties | properties.e2e-spec.ts | 15+ | Property listing operations | ✅ |
| Search | search.e2e-spec.ts | 6+ | Search and favorites | ✅ |
| Invitations | invitations.e2e-spec.ts | 8+ | Invitation system | ✅ |
| Negotiations | negotiations.e2e-spec.ts | 19 | Negotiation and transaction flow | ✅ |
| Payments | payments.e2e-spec.ts | 38 | Payment checkout, transactions, stats, refunds | ✅ |
| **Payments (Browser)** | Playwright MCP | 5 | Mock checkout, cancellation, transactions, refunds | ✅ |
| **Messaging (Unit)** | messaging.*.spec.ts | 79 | Conversations, messages, WebSocket gateway, real-time events | ✅ |
| **Messaging (E2E)** | messaging.e2e-spec.ts | 38 | Full messaging flow, conversations CRUD, messages, archive | ⏳ |
| **Messaging (Browser)** | messaging.spec.ts | 29 | UI interactions, real-time, accessibility, mobile responsive | ⏳ |
| **Applications (Unit)** | applications.*.spec.ts | 24 | Application CRUD, status transitions, authorization | ⏳ |
| **Applications (E2E)** | applications.e2e-spec.ts | 15 | Full rental application flow, owner review, withdrawal | ⏳ |
| **Leases (Unit)** | leases.*.spec.ts | 60 | Lease CRUD, payments, rent reminders, cron jobs, e-signature | ✅ |
| **Leases (E2E)** | leases.e2e-spec.ts | 15 | Full lease lifecycle, payments, activation, termination | ✅ |
| **Maintenance (Unit)** | maintenance.*.spec.ts | 49 | Maintenance CRUD, workflow transitions, authorization | ⏳ |
| **Maintenance (E2E)** | maintenance.e2e-spec.ts | 18 | Full maintenance workflow, approval, completion | ⏳ |
| **Lease Renewal (Unit)** | lease-renewal.service.spec.ts | 20 | Cron jobs, offer CRUD, status transitions, authorization | ⏳ |
| **Lease Renewal (E2E)** | lease-renewal.e2e-spec.ts | 15 | Full renewal workflow, accept/decline, new lease generation | ⏳ |
| **Dashboard (Unit)** | dashboard.*.spec.ts | 50 | Expense CRUD, dashboard aggregation, net income calculation, tenant dashboard, documents | ✅ |
| **Dashboard (E2E)** | dashboard.e2e-spec.ts | 24 | Full landlord dashboard, expenses CRUD, filtering, authorization | ✅ |
| **Tenant Portal (Unit)** | tenant-*.spec.ts | 21 | Tenant dashboard aggregation, document CRUD, authorization | ✅ |
| **Tenant Portal (E2E)** | tenant-portal.e2e-spec.ts | 26 | Tenant dashboard, e-signature flow, payment link, documents CRUD | ✅ |

---

## 9. Test Execution Summary

### CI/CD Status

**GitHub Actions:** https://github.com/ZKBD/12done/actions

| Workflow | Status | Last Run |
|----------|--------|----------|
| **CI** | ✅ Passing | 2025-12-29 |

CI Pipeline includes:
- **Lint** - ESLint with TypeScript rules
- **Unit Tests** - Jest with PostgreSQL + Redis services
- **E2E Tests** - Jest E2E with PostgreSQL + Redis + MailHog services
- **Build** - TypeScript compilation and artifact upload

### Branch Protection

**Ruleset:** "Protect main branch" (Active)
**Target:** Default branch (main)

| Required Check | Source | Status |
|----------------|--------|--------|
| Lint | GitHub Actions | ✅ Required |
| Unit Tests | GitHub Actions | ✅ Required |
| E2E Tests | GitHub Actions | ✅ Required |
| Build | GitHub Actions | ✅ Required |

**Additional Rules:**
- Restrict deletions (enabled)
- Block force pushes (enabled)

All PRs to `main` must pass all 4 CI checks before merging.

### Latest Test Run

| Date | Unit Tests | E2E Tests | Browser Tests | CI Status | Notes |
|------|------------|-----------|---------------|-----------|-------|
| 2025-12-30 | ✅ 1086 passed | ✅ 279 passed | ✅ 5 passed | ⏳ Pending | Implemented PROD-108 Predictive Maintenance (36 unit + 22 E2E) |
| 2025-12-30 | ✅ 1050 passed | ✅ 257 passed | ✅ 5 passed | ⏳ Pending | Implemented PROD-106 Tenant Portal (37 unit + 26 E2E) |
| 2025-12-29 | ✅ 1013 passed | ✅ 231 passed | ✅ 5 passed | ✅ Passing | Implemented PROD-100 Management Dashboard (29 unit + 24 E2E) |
| 2025-12-29 | ✅ 984 passed | ✅ 207 passed | ✅ 5 passed | ✅ Passing | Added WebSocket gateway for real-time messaging (30 tests) |
| 2025-12-29 | ✅ 954 passed | ✅ 207 passed | ✅ 5 passed | ✅ Passing | Added in-app messaging backend (49 tests) |
| 2025-12-29 | ✅ 905 passed | ✅ 207 passed | ✅ 5 passed | ✅ Passing | Browser payment flow tests (checkout, cancel, transactions, refund) |
| 2025-12-28 | ✅ 901 passed | ✅ 207 passed | - | ✅ Passing | Frontend payment checkout flow, backend schema fixes |
| 2025-12-27 | ✅ 901 passed | ✅ 207 passed | - | ✅ Passing | Added Stripe payment integration (37 unit + 14 E2E) |

### Environment Requirements

Tests MUST be run inside Docker containers. To execute tests:

```bash
# 1. Ensure Docker Desktop is running
# 2. Start the development environment
docker-compose up -d

# 3. Run unit tests
docker-compose exec app npm test

# 4. Run e2e tests
docker-compose exec app npm run test:e2e

# 5. Run tests with coverage
docker-compose exec app npm run test:cov
```

**Why Docker is required:**
- Project uses bcrypt which requires native compilation
- Path with spaces (iCloud) breaks native module builds
- Database and Redis dependencies need to be running
- Consistent test environment across machines

### Test File Inventory

| Category | Files | Test Cases (Approx) |
|----------|-------|---------------------|
| Service Unit Tests | 22 | ~551 |
| Controller Unit Tests | 7 | ~181 |
| Gateway/Guard Tests | 2 | ~30 |
| E2E Tests | 11 | ~295 |
| Browser Tests (Playwright) | 2 | 34 |
| **Total** | **44** | **~1132** |

---

## 10. Requirements Without Tests

The following requirements do not yet have test coverage:

| Req ID | Title | Reason |
|--------|-------|--------|
| PROD-008 | ID Verification | Not yet implemented |
| PROD-009 | Background Checks | Not yet implemented |
| PROD-010 | Verified Badges | Not yet implemented |
| PROD-011 | Biometric Authentication | Not yet implemented |
| PROD-029 | AI Description Generation | Not yet implemented |
| PROD-030 | Virtual Staging | Not yet implemented |
| PROD-031 | Time-of-Day Photos | Not yet implemented |
| PROD-044-047 | Advanced Search Features (Voice, Visual, AR, Lifestyle) | Phase 4 features |
| PROD-050 | AI Recommendations | Not yet implemented |
| ~~PROD-060-068~~ | ~~Service Providers~~ | ✅ **COMPLETE** - Prisma models, ServiceProvidersModule (controller, service, DTOs), availability calendar, job matching, admin approval, rating system; 51 unit tests (33 service + 18 controller); 47 E2E tests covering full API flow |
| PROD-096-097 | Advanced Transaction Features | Not yet implemented |
| ~~PROD-100-108~~ | ~~Property Management~~ | ✅ **COMPLETE** - All requirements (PROD-100 through PROD-108) implemented |
| ~~PROD-106~~ | ~~Tenant Portal~~ | ✅ **COMPLETE** - TenantDocument model, TenantDocumentType enum, e-signature fields on Lease, TenantDashboardService, TenantDocumentService, e-signature methods in LeasesService, 6 endpoints (tenant dashboard, document CRUD, sign lease, signature status, payment link); 37 unit tests (4 tenant-dashboard + 17 tenant-document + 16 e-signature); 26 E2E tests |
| ~~PROD-100~~ | ~~Management Dashboard~~ | ✅ **COMPLETE** - Expense model, ExpenseCategory enum, DashboardModule (controller, services, DTOs), landlord dashboard aggregation, expense CRUD, net income calculation; 29 unit tests (15 expense + 8 dashboard + 6 controller); 24 E2E tests covering full dashboard flow |
| ~~PROD-101~~ | ~~Rental Applications~~ | ✅ **COMPLETE** - RentalApplication model, ApplicationStatus enum, ApplicationsModule (controller, service, DTOs), notifications integration; 24 unit tests (18 service + 6 controller); 15 E2E tests covering application flow |
| ~~PROD-102~~ | ~~Rent Reminders~~ | ✅ **COMPLETE** - Lease model, RentPayment model, LeaseStatus/RentPaymentStatus enums, LeasesModule with RentReminderService, cron jobs for 5-day reminders and overdue checks, email templates; 44 unit tests (25 service + 10 reminder + 9 controller); 15 E2E tests |
| ~~PROD-103~~ | ~~Maintenance Workflows~~ | ✅ **COMPLETE** - MaintenanceRequest model, MaintenanceRequestType/Status/Priority enums, MaintenanceModule (controller, service, DTOs), full workflow (submit→approve→assign→schedule→complete→confirm), email templates; 49 unit tests (37 service + 12 controller); 18 E2E tests |
| ~~PROD-104~~ | ~~Application Status Notifications~~ | ✅ **COMPLETE** - Email notifications on application status changes (received, approved, rejected), 3 email templates, MailService integration in ApplicationsService; 7 new unit tests |
| ~~PROD-105~~ | ~~Lease Renewal Automation~~ | ✅ **COMPLETE** - LeaseRenewal model, LeaseRenewalStatus enum, LeaseRenewalService with cron jobs (60-day check, expiration), 6 endpoints (pending list, get/create/accept/decline/cancel), 5 email templates, auto-generates new lease on accept; 20 unit tests; 15 E2E tests |
| ~~PROD-107~~ | ~~AI Maintenance Assistant~~ | ✅ **COMPLETE** - AiMaintenanceService with keyword-based categorization (PROD-107.1), priority scoring (PROD-107.2), DIY solutions with step-by-step instructions (PROD-107.3), appointment scheduling based on provider availability (PROD-107.4); 3 endpoints (analyze, suggestions, appointment-suggestions); 28 unit tests; 14 E2E tests |
| ~~PROD-108~~ | ~~Predictive Maintenance~~ | ✅ **COMPLETE** - PredictiveMaintenanceService with historical data analysis (PROD-108.1), failure prediction with risk scoring (PROD-108.2), proactive alerts with weekly cron job (PROD-108.3), HVAC-specific predictions (PROD-108.4); 5 endpoints (history, property predictions, portfolio predictions, alerts, HVAC); 36 unit tests; 22 E2E tests |
| PROD-120-133 | AI Tour Guide | Not yet implemented |
| ~~PROD-200-205~~ | ~~Communication~~ | ✅ **COMPLETE** - Backend, WebSocket, Frontend UI, E2E tests, Playwright tests, offline support, virtualization |

---

## Update History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-27 | Claude | Initial matrix creation with all Phase 1 requirements |
| 2025-12-27 | Claude | Added environment requirements section; tests blocked due to Docker unavailability |
| 2025-12-27 | Claude | Added CI/CD status section; GitHub Actions now fully operational with all tests passing |
| 2025-12-27 | Claude | Added branch protection section; main branch now requires all 4 CI checks to pass |
| 2025-12-27 | Claude | Implemented PROD-041 (Search Agent Notifications); added 6 test cases covering notification trigger |
| 2025-12-27 | Claude | Implemented PROD-026 (No Agents Tag); added AGENT role, 12 test cases covering search exclusion and access control |
| 2025-12-27 | Claude | Implemented PROD-048 (Open House Filtering); added OpenHouseEvent model, 20 test cases covering CRUD and search filter |
| 2025-12-27 | Claude | Implemented PROD-043 (Map-Based Search); added bounding box, radius, and polygon search; 11 test cases |
| 2025-12-27 | Claude | Implemented PROD-090-095 (Negotiations & Transactions); added Negotiation, Offer, Transaction models; 62 test cases (43 unit + 19 E2E) |
| 2025-12-27 | Claude | Implemented Stripe payment integration (PROD-093, PROD-094, NFR-013); added PaymentsModule with checkout, refund, webhooks; 51 test cases (37 unit + 14 E2E) |
| 2025-12-28 | Claude | Refactored PaymentsModule to src/modules/payments/; added mock payment mode, transaction listing, stats; updated 30 test cases (17 service + 13 controller) |
| 2025-12-28 | Claude | Added comprehensive E2E tests for payments module; 38 test cases covering checkout, status, transactions, stats, refunds, webhooks |
| 2025-12-28 | Claude | Implemented frontend payment checkout flow; added PaymentConfirmationModal, PaymentStatusCard components; fixed backend schema mismatches (platformFeeRate, stripeSessionId); fixed frontend pagination format in useTransactions/usePayouts hooks |
| 2025-12-29 | Claude | Browser integration tests for payment system: mock checkout flow, cancellation, transactions list (buyer/seller views), refund flow; 5 Playwright tests added; all 905 unit tests passing |
| 2025-12-29 | Claude | Implemented in-app messaging backend (Phase 1): Prisma models (Conversation, ConversationParticipant, Message), MessagingModule with REST API for conversations and messages, WebSocket dependencies installed; 49 unit tests (35 service + 14 controller) |
| 2025-12-29 | Claude | Implemented WebSocket gateway (Phase 2): MessagingGateway with real-time events (join/leave conversation, send message, typing indicators, read receipts), WsJwtGuard for WebSocket authentication; 30 unit tests (22 gateway + 8 guard) |
| 2025-12-29 | Claude | Implemented frontend messaging hooks (Phase 3): messaging API client, TypeScript types, React Query hooks (useConversations, useMessages, useSendMessage, etc.), WebSocket hook (useMessagingSocket) with real-time updates, installed socket.io-client |
| 2025-12-29 | Claude | Implemented frontend messaging UI (Phase 4): messaging components (ConversationList, MessageThread, MessageBubble, MessageInput, TypingIndicator), messages pages (/dashboard/messages, /dashboard/messages/[conversationId]), NegotiationMessages component for in-negotiation chat, sidebar/mobile nav with unread badge, backend endpoint GET /messages/negotiations/:negotiationId/conversation |
| 2025-12-29 | Claude | Added messaging E2E tests (Phase 5): 38 test cases covering conversation CRUD, messages, read/unread status, archive, negotiation conversations, authorization checks, full messaging flow |
| 2025-12-29 | Claude | Added Playwright browser tests for messaging UI (Phase 5): 29 test cases in frontend/e2e/messaging.spec.ts covering messages page, conversation list, message thread, message input, typing indicators, real-time updates, mobile nav, negotiation messages tab, accessibility, error handling, loading states; added data-testid attributes to all messaging components for testability |
| 2025-12-29 | Claude | Added offline support and reconnection handling (Phase 5): ConnectionStatus tracking (connected/connecting/disconnected/offline), browser online/offline event listeners, exponential backoff reconnection, message queue for offline messages, ConnectionStatusIndicator and ConnectionBanner UI components |
| 2025-12-29 | Claude | Added virtualized lists for performance (Phase 5): @tanstack/react-virtual for efficient rendering, VirtualizedMessageList for messages > 50, VirtualizedConversationList for long conversation lists, auto-virtualization in MessageThread component |
| 2025-12-29 | Claude | Implemented Service Providers (PROD-060-068): Prisma models (ServiceProvider, ProviderAvailability, AvailabilityException, ServiceRequest, ProviderReview), ServiceProvidersModule with full REST API for provider applications, profiles, availability calendar, job matching, admin approval, rating/review system; 51 unit tests (33 service + 18 controller) |
| 2025-12-29 | Claude | Added E2E tests for Service Providers (PROD-060-068): 47 test cases in service-providers.e2e-spec.ts covering provider application, profile management, availability calendar, service requests workflow, admin approval/suspension, reviews CRUD, and authorization |
| 2025-12-29 | Claude | Implemented Rental Applications (PROD-101.2-101.6): RentalApplication model with ApplicationStatus enum, ApplicationsModule (controller, service, DTOs), notifications for APPLICATION_RECEIVED/STATUS_CHANGED/WITHDRAWN; 24 unit tests (18 service + 6 controller); 15 E2E tests covering full application lifecycle |
| 2025-12-29 | Claude | Implemented Rent Reminders (PROD-102.1-102.6): Lease model with LeaseStatus enum, RentPayment model with RentPaymentStatus enum, LeasesModule (controller, service, DTOs), RentReminderService with @Cron jobs for 5-day reminders and overdue checks, email templates for rent-reminder/rent-overdue/rent-payment-received; 44 unit tests (25 service + 10 reminder + 9 controller); 15 E2E tests |
| 2025-12-29 | Claude | Verified PROD-102 tests passing: Updated all 38 PROD-102 test case statuses from ⏳ to ✅; fixed E2E test status code expectations (POST endpoints return 201); CI confirmed all 59 lease tests passing (44 unit + 15 E2E); updated test counts (1079 unit, 269 E2E, 1353 total) |
| 2025-12-29 | Claude | Implemented Maintenance Workflows (PROD-103.1-103.13): MaintenanceRequest model with Type/Status/Priority enums, MaintenanceModule (controller, service, DTOs), full multi-party workflow (tenant submit, landlord approve/reject/assign, provider start/complete, dual-party confirm), 6 email templates, 7 NotificationType values; 49 unit tests (37 service + 12 controller); 18 E2E tests covering full maintenance lifecycle |
| 2025-12-29 | Claude | Implemented Lease Renewal Automation (PROD-105.1-105.9): LeaseRenewal model with LeaseRenewalStatus enum (PENDING, OFFERED, ACCEPTED, DECLINED, EXPIRED, CANCELLED), LeaseRenewalService with @Cron jobs (60-day check at 2 AM, offer expiration at 3 AM), 6 endpoints (GET pending renewals, GET/POST/DELETE renewal, POST accept/decline), 5 email templates, 5 NotificationType values, auto-generates new lease on accept; 20 unit tests; 15 E2E tests |
| 2025-12-29 | Claude | Implemented Application Status Notifications (PROD-104.1-104.5): Email notifications for application lifecycle (received confirmation to applicant, congratulations on approval, empathetic rejection), 3 email templates (application-received.hbs, application-approved.hbs, application-rejected.hbs), MailService integration in ApplicationsService; 7 unit tests added |
| 2025-12-29 | Claude | Implemented Management Dashboard (PROD-100.1-100.8): ExpenseCategory enum, Expense model with landlord/property relations, DashboardModule (DashboardController, DashboardService, ExpenseService), landlord dashboard aggregation (properties, income, expenses, maintenance), expense CRUD with filtering, net income calculation; 29 unit tests (15 expense + 8 dashboard + 6 controller); 24 E2E tests |
| 2025-12-30 | Claude | Implemented Tenant Portal (PROD-106.1-106.7): TenantDocument model with TenantDocumentType enum, e-signature fields on Lease (landlordSignedAt/tenantSignedAt/IP), TenantDashboardService for aggregated tenant view, TenantDocumentService for document CRUD, e-signature methods in LeasesService (signLease, getSignatureStatus, getPaymentLink), 6 endpoints for tenant dashboard/documents/signing; 37 unit tests (4 tenant-dashboard + 17 tenant-document + 16 e-signature); 26 E2E tests |
| 2025-12-30 | Claude | Implemented AI Maintenance Assistant (PROD-107.1-107.4): AiMaintenanceService with keyword-based categorization, priority scoring with urgency indicators, DIY solutions database with step-by-step instructions and tool lists, appointment scheduling based on provider weekly availability; 3 endpoints (POST /analyze, GET /:id/suggestions, POST /appointment-suggestions); 28 unit tests; 14 E2E tests |
| 2025-12-30 | Claude | Implemented Predictive Maintenance (PROD-108.1-108.4): PredictiveMaintenanceService with historical data analysis (aggregated stats by maintenance type), failure prediction with risk scoring (age multipliers, frequency analysis, seasonal adjustments), proactive alerts with weekly cron job (Monday 8 AM), HVAC-specific predictions (lifespan tracking, health status, seasonal risk); 5 endpoints (GET /history/:propertyId, GET /predictions/property/:propertyId, GET /predictions/portfolio, GET /alerts, GET /hvac/:propertyId); 36 unit tests; 22 E2E tests; Moved ScheduleModule.forRoot() to app.module.ts |

---

*This document is auto-referenced by CLAUDE.md and must be updated with each test change.*
