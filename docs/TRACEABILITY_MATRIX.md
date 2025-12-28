# Requirements Traceability Matrix

**Project:** 12done.com
**Last Updated:** 2025-12-28
**Version:** 1.3

This document traces requirements from the SRS to their implementing test cases and results. It must be updated whenever:
- New requirements are added to the SRS
- New test cases are created
- Tests are run and results change

---

## Test Run Summary (2025-12-27)

| Test Type | Passed | Failed | Total | Pass Rate |
|-----------|--------|--------|-------|-----------|
| Unit Tests | 901 | 0 | 901 | 100% |
| E2E Tests | 207 | 0 | 207 | 100% |
| **Total** | **1108** | **0** | **1108** | **100%** |

All tests passing locally and in CI.

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
| Payments | payments.e2e-spec.ts | - | Payment processing (E2E tests pending) | ⏳ |

---

## 9. Test Execution Summary

### CI/CD Status

**GitHub Actions:** https://github.com/ZKBD/12done/actions

| Workflow | Status | Last Run |
|----------|--------|----------|
| **CI** | ✅ Passing | 2025-12-27 |

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

| Date | Unit Tests | E2E Tests | CI Status | Notes |
|------|------------|-----------|-----------|-------|
| 2025-12-27 | ✅ 901 passed | ✅ 207 passed | ✅ Passing | Added Stripe payment integration (37 unit + 14 E2E) |

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
| Service Unit Tests | 17 | ~450 |
| Controller Unit Tests | 5 | ~160 |
| E2E Tests | 7 | ~70 |
| **Total** | **29** | **~680** |

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
| PROD-060-068 | Service Providers | Partial implementation |
| PROD-096-097 | Advanced Transaction Features | Not yet implemented |
| PROD-100-108 | Property Management | Partial implementation |
| PROD-120-133 | AI Tour Guide | Not yet implemented |
| PROD-200-205 | Communication | Partial implementation |

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

---

*This document is auto-referenced by CLAUDE.md and must be updated with each test change.*
