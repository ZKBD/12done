# Requirements Traceability Matrix

**Project:** 12done.com
**Last Updated:** 2025-12-31
**Version:** 2.2

This document traces requirements from the SRS to their implementing test cases and results. It must be updated whenever:
- New requirements are added to the SRS
- New test cases are created
- Tests are run and results change

---

## Test Run Summary (2025-12-31)

| Test Type | Passed | Failed | Total | Pass Rate |
|-----------|--------|--------|-------|-----------|
| Unit Tests | 2163 | 0 | 2163 | 100% |
| E2E Tests | 357 | 0 | 357 | 100% |
| Browser Tests | 5 | 0 | 5 | 100% |
| **Total** | **2525** | **0** | **2525** | **100%** |

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

### PROD-008: ID Verification

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-008.1 | `submitVerification > should submit verification request successfully` | verification.service.spec.ts | Verifies VerificationRequest model creation | ✅ |
| PROD-008.2 | `submitVerification > POST /verification/identity` | verification.controller.spec.ts | Verifies ID document submission endpoint | ✅ |
| PROD-008.3 | `submitVerification > documentType validation` | verification.service.spec.ts | Verifies PASSPORT, DRIVERS_LICENSE, NATIONAL_ID types | ✅ |
| PROD-008.4 | `submitVerification > stores document URL` | verification.service.spec.ts | Verifies secure document URL storage | ✅ |
| PROD-008.5 | `getPendingVerifications > returns paginated queue` | verification.service.spec.ts | Verifies admin pending verification queue | ✅ |
| PROD-008.6 | `reviewVerification > approve/reject` | verification.service.spec.ts | Verifies admin can approve/reject | ✅ |
| PROD-008.7 | `reviewVerification > updates user status` | verification.service.spec.ts | Verifies user isIdentityVerified flag update | ✅ |
| PROD-008.8 | `reviewVerification > sends email notification` | verification.service.spec.ts | Verifies approval/rejection email sent | ✅ |

### PROD-009: Background Checks

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-009.1 | `requestBackgroundCheck > creates BackgroundCheck model` | verification.service.spec.ts | Verifies BackgroundCheck creation with type | ✅ |
| PROD-009.2 | `requestBackgroundCheck > POST /verification/background-check` | verification.controller.spec.ts | Verifies background check request endpoint | ✅ |
| PROD-009.3 | `processBackgroundCheckWebhook > updates from provider` | verification.service.spec.ts | Verifies webhook processing from provider | ✅ |
| PROD-009.4 | `getBackgroundChecks > returns user check history` | verification.service.spec.ts | Verifies secure report URL storage | ✅ |
| PROD-009.5 | `requestBackgroundCheck > requires consent` | verification.service.spec.ts | Verifies consent flow validation | ✅ |

### PROD-010: Verified Badges

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-010.1 | `User model > idVerificationStatus, backgroundCheckStatus` | prisma/schema.prisma | Verifies verification flags on User model | ✅ |
| PROD-010.2 | `hasVerifiedBadge > returns true when verified` | verification.service.spec.ts | Verifies badge display logic | ✅ |
| PROD-010.3 | `getVerifiedUsers > returns verified user IDs` | verification.service.spec.ts | Verifies filter by verified status | ✅ |
| PROD-010.4 | `getVerificationStatus > includes badge info` | verification.service.spec.ts | Verifies badge tooltip data | ✅ |

### PROD-011: Biometric Authentication

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-011.1 | `enrollDevice > should enroll new device` | biometric.service.spec.ts | Verifies device enrollment with public key | ✅ |
| PROD-011.1 | `enrollDevice > should throw if device already enrolled` | biometric.service.spec.ts | Verifies duplicate device enrollment returns error | ✅ |
| PROD-011.1 | `enrollDevice > should throw if public key is invalid` | biometric.service.spec.ts | Verifies invalid public key format is rejected | ✅ |
| PROD-011.1 | `enrollDevice > should enable biometric for user` | biometric.service.spec.ts | Verifies user biometricEnabled is set on first enrollment | ✅ |
| PROD-011.1 | `generateChallenge > should create challenge for device` | biometric.service.spec.ts | Verifies 32-byte random challenge generation | ✅ |
| PROD-011.1 | `generateChallenge > should throw if device not enrolled` | biometric.service.spec.ts | Verifies challenge requires enrolled device | ✅ |
| PROD-011.1 | `generateChallenge > should throw if device inactive` | biometric.service.spec.ts | Verifies inactive device cannot get challenge | ✅ |
| PROD-011.1 | `authenticate > should verify signature and return tokens` | biometric.service.spec.ts | Verifies RSA-SHA256 signature verification | ✅ |
| PROD-011.1 | `authenticate > should throw if signature invalid` | biometric.service.spec.ts | Verifies invalid signature is rejected | ✅ |
| PROD-011.1 | `authenticate > should throw if challenge expired` | biometric.service.spec.ts | Verifies 5-minute challenge expiry | ✅ |
| PROD-011.1 | `authenticate > should throw if challenge already used` | biometric.service.spec.ts | Verifies one-time challenge usage | ✅ |
| PROD-011.1 | `authenticate > should throw if biometric disabled` | biometric.service.spec.ts | Verifies biometric must be enabled | ✅ |
| PROD-011.2 | `getDevices > should return enrolled devices` | biometric.service.spec.ts | Verifies device list retrieval | ✅ |
| PROD-011.2 | `updateDevice > should update device name` | biometric.service.spec.ts | Verifies device name update | ✅ |
| PROD-011.2 | `updateDevice > should update device active status` | biometric.service.spec.ts | Verifies device deactivation | ✅ |
| PROD-011.2 | `updateDevice > should throw if device not found` | biometric.service.spec.ts | Verifies error for non-existent device | ✅ |
| PROD-011.2 | `removeDevice > should delete device` | biometric.service.spec.ts | Verifies device removal | ✅ |
| PROD-011.2 | `removeDevice > should disable biometric if last device` | biometric.service.spec.ts | Verifies biometric auto-disable when no devices remain | ✅ |
| PROD-011.3 | `updateBiometricSettings > should enable biometric` | biometric.service.spec.ts | Verifies biometricEnabled flag update | ✅ |
| PROD-011.3 | `updateBiometricSettings > should throw if no devices` | biometric.service.spec.ts | Verifies cannot enable without enrolled devices | ✅ |
| PROD-011.3 | `updateBiometricSettings > should disable biometric` | biometric.service.spec.ts | Verifies biometric can be disabled | ✅ |
| PROD-011.4 | `authenticate > fallback to password always available` | biometric.service.spec.ts | Password auth always works via AuthService | ✅ |
| PROD-011.5 | `isBiometricRequired > should return true for sensitive actions` | biometric.service.spec.ts | Verifies payment, profile changes require biometric | ✅ |
| PROD-011.5 | `isBiometricRequired > should return false for non-sensitive actions` | biometric.service.spec.ts | Verifies regular actions don't require biometric | ✅ |
| PROD-011.5 | `verifyForSensitiveAction > should verify biometric` | biometric.service.spec.ts | Verifies biometric re-verification for sensitive actions | ✅ |
| PROD-011.5 | `verifyForSensitiveAction > should pass if biometric disabled` | biometric.service.spec.ts | Verifies fallback when biometric not enabled | ✅ |

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
| PROD-025.7 | `bookSlot > should send notification to property owner when slot is booked` | inspection.service.spec.ts | Verifies owner receives INSPECTION_BOOKED notification | ✅ |
| PROD-025.8 | `bookSlot > should not fail if notification fails` | inspection.service.spec.ts | Verifies booking succeeds even if notification fails | ✅ |
| PROD-025.9 | `cancelBooking > should send notification to property owner when booker cancels` | inspection.service.spec.ts | Verifies owner receives INSPECTION_CANCELLED notification when booker cancels | ✅ |
| PROD-025.10 | `cancelBooking > should send notification to booker when owner cancels` | inspection.service.spec.ts | Verifies booker receives INSPECTION_CANCELLED notification when owner cancels | ✅ |
| PROD-025.11 | `cancelBooking > should not fail if cancellation notification fails` | inspection.service.spec.ts | Verifies cancellation succeeds even if notification fails | ✅ |

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
| PROD-029.1 | `generateDescription > should generate description with default tone` | ai-description.service.spec.ts | Verifies description generation with default MODERN_PROFESSIONAL tone | ✅ |
| PROD-029.2 | `generateDescription > should generate description with specified tone` | ai-description.service.spec.ts | Verifies description uses requested tone style | ✅ |
| PROD-029.3 | `generateDescription > should throw NotFoundException if property not found` | ai-description.service.spec.ts | Verifies error handling for missing property | ✅ |
| PROD-029.4 | `generateDescription > should throw ForbiddenException if not owner` | ai-description.service.spec.ts | Verifies only owner can generate descriptions | ✅ |
| PROD-029.5 | `generateDescription > should allow admin to generate description` | ai-description.service.spec.ts | Verifies admin bypass for ownership check | ✅ |
| PROD-029.6 | `saveDescription > should save description to property` | ai-description.service.spec.ts | Verifies description is saved to aiGeneratedDescription field | ✅ |
| PROD-029.7 | `saveDescription > should throw NotFoundException if property not found` | ai-description.service.spec.ts | Verifies error handling for missing property | ✅ |
| PROD-029.8 | `saveDescription > should throw ForbiddenException if not owner` | ai-description.service.spec.ts | Verifies only owner can save descriptions | ✅ |
| PROD-029.9 | `applyDescription > should apply AI description to main description` | ai-description.service.spec.ts | Verifies description is copied to main description field | ✅ |
| PROD-029.10 | `applyDescription > should throw NotFoundException if no AI description exists` | ai-description.service.spec.ts | Verifies error when no AI description to apply | ✅ |
| PROD-029.11 | `applyDescription > should throw ForbiddenException if not owner` | ai-description.service.spec.ts | Verifies only owner can apply descriptions | ✅ |
| PROD-029.12 | `buildDescription > should generate LUXURY tone description` | ai-description.service.spec.ts | Verifies luxury tone uses words like "exceptional", "prestigious" | ✅ |
| PROD-029.13 | `buildDescription > should generate FAMILY_FRIENDLY tone description` | ai-description.service.spec.ts | Verifies family tone uses words like "family", "home" | ✅ |
| PROD-029.14 | `buildDescription > should generate INVESTMENT_FOCUSED tone description` | ai-description.service.spec.ts | Verifies investment tone uses "investment", "ROI" | ✅ |
| PROD-029.15 | `buildDescription > should generate MODERN_PROFESSIONAL tone description` | ai-description.service.spec.ts | Verifies modern tone uses "contemporary", "functionality" | ✅ |
| PROD-029.16 | `buildDescription > should generate COZY_WELCOMING tone description` | ai-description.service.spec.ts | Verifies cozy tone uses "charming", "comfort" | ✅ |
| PROD-029.17 | `buildDescription > should include bedroom count` | ai-description.service.spec.ts | Verifies bedroom count appears in description | ✅ |
| PROD-029.18 | `buildDescription > should include square meters` | ai-description.service.spec.ts | Verifies square meters with m² unit in description | ✅ |
| PROD-029.19 | `buildDescription > should include pet-friendly feature` | ai-description.service.spec.ts | Verifies pet-friendly is mentioned when applicable | ✅ |
| PROD-029.20 | `buildDescription > should include price in closing` | ai-description.service.spec.ts | Verifies formatted price in closing section | ✅ |
| PROD-029.21 | `buildDescription > should handle property with minimal data` | ai-description.service.spec.ts | Verifies graceful handling of null/empty fields | ✅ |
| PROD-029.22 | `buildDescription > should format historic buildings with character` | ai-description.service.spec.ts | Verifies historic buildings get "character" mention | ✅ |
### PROD-030: Virtual Staging

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-030.1 | `createStagingRequest > should create staging request and process it` | virtual-staging.service.spec.ts | Verifies staging request creation with room type and style | ✅ |
| PROD-030.2 | `createStagingRequest > should throw NotFoundException if property not found` | virtual-staging.service.spec.ts | Verifies property validation | ✅ |
| PROD-030.3 | `createStagingRequest > should throw ForbiddenException if user not owner` | virtual-staging.service.spec.ts | Verifies only property owner can request staging | ✅ |
| PROD-030.4 | `createStagingRequest > should allow admin to create staging request` | virtual-staging.service.spec.ts | Verifies admin bypass for staging requests | ✅ |
| PROD-030.5 | `createStagingRequest > should throw NotFoundException if media not found` | virtual-staging.service.spec.ts | Verifies media validation | ✅ |
| PROD-030.6 | `createStagingRequest > should throw BadRequestException if media does not belong to property` | virtual-staging.service.spec.ts | Verifies media-property relationship | ✅ |
| PROD-030.7 | `createStagingRequest > should throw BadRequestException if media is not a photo` | virtual-staging.service.spec.ts | Verifies only photos can be staged | ✅ |
| PROD-030.8 | `createStagingRequest > should throw BadRequestException if staging request already in progress` | virtual-staging.service.spec.ts | Prevents duplicate staging requests | ✅ |
| PROD-030.9 | `getStagingRequest > should return staging request` | virtual-staging.service.spec.ts | Verifies fetching individual staging request | ✅ |
| PROD-030.10 | `getStagingRequest > should throw NotFoundException if request not found` | virtual-staging.service.spec.ts | Verifies staging request validation | ✅ |
| PROD-030.11 | `getStagingRequest > should throw ForbiddenException if user not authorized` | virtual-staging.service.spec.ts | Verifies authorization for viewing staging requests | ✅ |
| PROD-030.12 | `getStagingRequests > should return all staging requests for property` | virtual-staging.service.spec.ts | Verifies listing all staging requests | ✅ |
| PROD-030.13 | `getStagedMedia > should return all staged media for property` | virtual-staging.service.spec.ts | Verifies listing all staged images with badge | ✅ |
| PROD-030.14 | `getStagedMedia > should throw NotFoundException if property not found` | virtual-staging.service.spec.ts | Verifies property validation for staged media | ✅ |
| PROD-030.15 | `deleteStagedMedia > should delete staged media` | virtual-staging.service.spec.ts | Verifies staged image deletion | ✅ |
| PROD-030.16 | `deleteStagedMedia > should throw BadRequestException if media is not staged` | virtual-staging.service.spec.ts | Verifies only staged media can be deleted via this endpoint | ✅ |
| PROD-030.17 | `compareImages > should return original and staged images` | virtual-staging.service.spec.ts | Verifies before/after comparison endpoint | ✅ |
| PROD-030.18 | `compareImages > should throw BadRequestException if media is not staged` | virtual-staging.service.spec.ts | Verifies comparison requires staged media | ✅ |
| PROD-030.19 | `compareImages > should throw NotFoundException if original media not found` | virtual-staging.service.spec.ts | Verifies original media exists for comparison | ✅ |

### PROD-031: Time-of-Day Photos

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-031.1 | `tagMedia > should tag media with time of day and season` | time-of-day-photos.service.spec.ts | Verifies time-of-day and season tagging | ✅ |
| PROD-031.2 | `tagMedia > should throw NotFoundException if property not found` | time-of-day-photos.service.spec.ts | Verifies property validation for tagging | ✅ |
| PROD-031.3 | `tagMedia > should throw ForbiddenException if user not owner` | time-of-day-photos.service.spec.ts | Verifies only owner can tag media | ✅ |
| PROD-031.4 | `tagMedia > should allow admin to tag media` | time-of-day-photos.service.spec.ts | Verifies admin bypass for tagging | ✅ |
| PROD-031.5 | `tagMedia > should throw NotFoundException if media not found` | time-of-day-photos.service.spec.ts | Verifies media validation for tagging | ✅ |
| PROD-031.6 | `tagMedia > should throw NotFoundException if media belongs to different property` | time-of-day-photos.service.spec.ts | Verifies media-property relationship | ✅ |
| PROD-031.7 | `createPhotoGroup > should create a photo group` | time-of-day-photos.service.spec.ts | Verifies photo group creation for angle linking | ✅ |
| PROD-031.8 | `createPhotoGroup > should throw NotFoundException if property not found` | time-of-day-photos.service.spec.ts | Verifies property validation for group creation | ✅ |
| PROD-031.9 | `createPhotoGroup > should throw ForbiddenException if user not owner` | time-of-day-photos.service.spec.ts | Verifies only owner can create groups | ✅ |
| PROD-031.10 | `addToGroup > should add media to a photo group` | time-of-day-photos.service.spec.ts | Verifies adding media to photo groups | ✅ |
| PROD-031.11 | `addToGroup > should throw NotFoundException if media not found` | time-of-day-photos.service.spec.ts | Verifies media validation for group operations | ✅ |
| PROD-031.12 | `removeFromGroup > should remove media from a photo group` | time-of-day-photos.service.spec.ts | Verifies removing media from groups | ✅ |
| PROD-031.13 | `getPhotoGroups > should return all photo groups for property` | time-of-day-photos.service.spec.ts | Verifies listing all photo groups | ✅ |
| PROD-031.14 | `getPhotoGroups > should throw NotFoundException if property not found` | time-of-day-photos.service.spec.ts | Verifies property validation for group listing | ✅ |
| PROD-031.15 | `getPhotoGroup > should return a specific photo group` | time-of-day-photos.service.spec.ts | Verifies fetching individual photo group | ✅ |
| PROD-031.16 | `getPhotoGroup > should throw NotFoundException if group is empty` | time-of-day-photos.service.spec.ts | Verifies empty group handling | ✅ |
| PROD-031.17 | `getTimeTaggedMedia > should return all time-tagged media` | time-of-day-photos.service.spec.ts | Verifies listing all tagged media | ✅ |
| PROD-031.18 | `getTimeTaggedMedia > should throw NotFoundException if property not found` | time-of-day-photos.service.spec.ts | Verifies property validation | ✅ |
| PROD-031.19 | `getMediaByTimeOfDay > should return media filtered by time of day` | time-of-day-photos.service.spec.ts | Verifies filtering by time (DAWN, NOON, etc.) | ✅ |
| PROD-031.20 | `getMediaByTimeOfDay > should throw NotFoundException if property not found` | time-of-day-photos.service.spec.ts | Verifies property validation for time filter | ✅ |
| PROD-031.21 | `getMediaBySeason > should return media filtered by season` | time-of-day-photos.service.spec.ts | Verifies filtering by season (SPRING, SUMMER, etc.) | ✅ |
| PROD-031.22 | `getSliderData > should return slider data organized by time and season` | time-of-day-photos.service.spec.ts | Verifies slider UI data structure for comparison | ✅ |
| PROD-031.23 | `bulkTagMedia > should bulk tag multiple media items` | time-of-day-photos.service.spec.ts | Verifies batch tagging operations | ✅ |
| PROD-031.24 | `bulkTagMedia > should skip invalid media items` | time-of-day-photos.service.spec.ts | Verifies graceful handling of invalid items | ✅ |
| PROD-031.25 | `bulkTagMedia > should throw ForbiddenException if user not owner` | time-of-day-photos.service.spec.ts | Verifies authorization for bulk operations | ✅ |

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
| PROD-041.7 | `notification frequency (PROD-041) > should create agent with default INSTANT frequency` | search-agents.service.spec.ts | Verifies default frequency is INSTANT | ✅ |
| PROD-041.8 | `notification frequency (PROD-041) > should create agent with DAILY_DIGEST frequency` | search-agents.service.spec.ts | Verifies DAILY_DIGEST frequency can be set | ✅ |
| PROD-041.9 | `notification frequency (PROD-041) > should create agent with WEEKLY_DIGEST frequency` | search-agents.service.spec.ts | Verifies WEEKLY_DIGEST frequency can be set | ✅ |
| PROD-041.10 | `notification frequency (PROD-041) > should generate unsubscribe token on create` | search-agents.service.spec.ts | Verifies unsubscribe token is generated | ✅ |
| PROD-041.11 | `notification frequency (PROD-041) > should return notificationFrequency in response DTO` | search-agents.service.spec.ts | Verifies response includes frequency field | ✅ |
| PROD-041.12 | `checkAgainstNewProperty with digest frequency > should queue for digest when frequency is DAILY_DIGEST` | search-agents.service.spec.ts | Verifies daily digest queuing | ✅ |
| PROD-041.13 | `checkAgainstNewProperty with digest frequency > should queue for digest when frequency is WEEKLY_DIGEST` | search-agents.service.spec.ts | Verifies weekly digest queuing | ✅ |
| PROD-041.14 | `checkAgainstNewProperty with digest frequency > should send instant email when frequency is INSTANT` | search-agents.service.spec.ts | Verifies instant notification behavior | ✅ |
| PROD-041.15 | `checkAgainstNewProperty with digest frequency > should include unsubscribeUrl in instant notification` | search-agents.service.spec.ts | Verifies unsubscribe URL in emails | ✅ |
| PROD-041.16 | `unsubscribe (PROD-041.7) > should unsubscribe with valid token` | search-agents.service.spec.ts | Verifies successful unsubscribe | ✅ |
| PROD-041.17 | `unsubscribe (PROD-041.7) > should throw NotFoundException with invalid token` | search-agents.service.spec.ts | Verifies invalid token handling | ✅ |
| PROD-041.18 | `unsubscribe (PROD-041.7) > should query by unsubscribeToken` | search-agents.service.spec.ts | Verifies token lookup | ✅ |
| PROD-041.19 | `sendDailyDigests > should call sendDigests with DAILY_DIGEST frequency` | search-agent-digest.service.spec.ts | Verifies daily digest cron job | ✅ |
| PROD-041.20 | `sendWeeklyDigests > should call sendDigests with WEEKLY_DIGEST frequency` | search-agent-digest.service.spec.ts | Verifies weekly digest cron job | ✅ |
| PROD-041.21 | `sendDigests > should find active agents with pending matches` | search-agent-digest.service.spec.ts | Verifies agent query for digests | ✅ |
| PROD-041.22 | `sendDigests > should send digest email with correct properties` | search-agent-digest.service.spec.ts | Verifies digest email content | ✅ |
| PROD-041.23 | `sendDigests > should mark matches as notified after sending` | search-agent-digest.service.spec.ts | Verifies match status update | ✅ |
| PROD-041.24 | `sendDigests > should return count of digests sent` | search-agent-digest.service.spec.ts | Verifies return value | ✅ |
| PROD-041.25 | `sendDigests > should not send if no agents with pending matches` | search-agent-digest.service.spec.ts | Verifies empty handling | ✅ |
| PROD-041.26 | `sendDigests > should continue processing other agents if one fails` | search-agent-digest.service.spec.ts | Verifies error resilience | ✅ |
| PROD-041.27 | `sendDigests > should format property prices correctly` | search-agent-digest.service.spec.ts | Verifies price formatting | ✅ |
| PROD-041.28 | `cleanupOldMatches > should delete matches notified more than 30 days ago` | search-agent-digest.service.spec.ts | Verifies old match cleanup | ✅ |
| PROD-041.29 | `cleanupOldMatches > should not delete unnotified matches` | search-agent-digest.service.spec.ts | Verifies pending match protection | ✅ |

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

### PROD-044: Voice Search

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-044.1 | `parse > city extraction > should extract city from "apartments in Budapest"` | voice-search.service.spec.ts | Verifies city name extraction from natural language | ✅ |
| PROD-044.2 | `parse > country extraction > should extract country from "property in Hungary"` | voice-search.service.spec.ts | Verifies country name extraction with ISO code mapping | ✅ |
| PROD-044.3 | `parse > price extraction > should extract max price from "under 500k"` | voice-search.service.spec.ts | Verifies price parsing with abbreviations (k, million) | ✅ |
| PROD-044.4 | `parse > price extraction > should extract price range from "between 200 and 500 thousand"` | voice-search.service.spec.ts | Verifies price range extraction | ✅ |
| PROD-044.5 | `parse > bedroom extraction > should extract bedrooms from "3 bedroom apartment"` | voice-search.service.spec.ts | Verifies bedroom count extraction | ✅ |
| PROD-044.6 | `parse > bathroom extraction > should extract bathrooms from "2 bathroom house"` | voice-search.service.spec.ts | Verifies bathroom count extraction | ✅ |
| PROD-044.7 | `parse > listing type extraction > should extract FOR_SALE from "buy"` | voice-search.service.spec.ts | Verifies listing type detection from intent keywords | ✅ |
| PROD-044.8 | `parse > listing type extraction > should extract LONG_TERM_RENT from "rent"` | voice-search.service.spec.ts | Verifies rental intent detection | ✅ |
| PROD-044.9 | `parse > listing type extraction > should extract SHORT_TERM_RENT from "airbnb"` | voice-search.service.spec.ts | Verifies short-term rental detection | ✅ |
| PROD-044.10 | `parse > feature extraction > should extract petFriendly from "pet friendly"` | voice-search.service.spec.ts | Verifies feature flag extraction | ✅ |
| PROD-044.11 | `parse > feature extraction > should extract newlyBuilt from "new build"` | voice-search.service.spec.ts | Verifies new build detection | ✅ |
| PROD-044.12 | `parse > feature extraction > should extract accessible from "wheelchair accessible"` | voice-search.service.spec.ts | Verifies accessibility detection | ✅ |
| PROD-044.13 | `parse > square meters extraction > should extract size from "100 sqm apartment"` | voice-search.service.spec.ts | Verifies size extraction with units | ✅ |
| PROD-044.14 | `parse > year built extraction > should extract min year from "built after 2010"` | voice-search.service.spec.ts | Verifies year range extraction | ✅ |
| PROD-044.15 | `parse > complex queries > should parse multi-criteria query` | voice-search.service.spec.ts | Verifies combined parsing (bedrooms + city + price) | ✅ |
| PROD-044.16 | `parse > normalization > should handle uppercase text` | voice-search.service.spec.ts | Verifies case-insensitive parsing | ✅ |
| PROD-044.17 | `parse > confidence scoring > should return overall confidence between 0 and 1` | voice-search.service.spec.ts | Verifies confidence calculation | ✅ |
| PROD-044.18 | `parse > confidence scoring > should return 0 confidence for unparseable text` | voice-search.service.spec.ts | Verifies fallback for unrecognized input | ✅ |
| PROD-044.19 | `parse > display text generation > should generate display text` | voice-search.service.spec.ts | Verifies human-readable summary generation | ✅ |
| PROD-044.20 | `parse > display text generation > should return "All properties" for empty parse` | voice-search.service.spec.ts | Verifies default display text | ✅ |
| PROD-044.21 | `parse > edge cases > should handle empty string` | voice-search.service.spec.ts | Verifies graceful handling of empty input | ✅ |
| PROD-044.22 | `parse > edge cases > should not extract invalid bedroom count` | voice-search.service.spec.ts | Verifies sanity checks (>10 bedrooms rejected) | ✅ |
| PROD-044.23 | `toPropertyQuery > should convert parsed criteria to query object` | voice-search.service.spec.ts | Verifies conversion to PropertyQueryDto format | ✅ |
| PROD-044.24 | `toPropertyQuery > should include listing types as array` | voice-search.service.spec.ts | Verifies listing types array format | ✅ |
| PROD-044.25 | `POST /api/voice-search/parse > should parse simple city search` | search.e2e-spec.ts | E2E test of parse endpoint | ✅ |
| PROD-044.26 | `POST /api/voice-search/parse > should parse complex multi-criteria query` | search.e2e-spec.ts | E2E test of complex parsing | ✅ |
| PROD-044.27 | `POST /api/voice-search/parse > should reject without authentication` | search.e2e-spec.ts | E2E test of auth requirement | ✅ |
| PROD-044.28 | `POST /api/voice-search/parse > should reject empty transcript` | search.e2e-spec.ts | E2E test of validation | ✅ |
| PROD-044.29 | `POST /api/voice-search/to-query > should convert transcript to query parameters` | search.e2e-spec.ts | E2E test of to-query endpoint | ✅ |
| PROD-044.30 | `POST /api/voice-search/to-query > should include boolean features in query` | search.e2e-spec.ts | E2E test of feature conversion | ✅ |
| PROD-044.31 | Country extraction uses word boundary matching | voice-search.service.ts:368 | Prevents false positives (e.g., "USA" detected in unrelated text) by using regex `\b` word boundaries instead of simple includes() | ✅ |
| PROD-044.32 | City extraction filters country names and stop words | voice-search.service.ts:361-367 | Prevents capturing "Usa Under" or "Spain With" as city names by filtering cityExcludeWords (price keywords, country names) | ✅ |

### PROD-045: Visual Search

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-045.1 | `generatePHash > should generate consistent hash for same image` | visual-search.service.spec.ts | Verifies perceptual hash consistency | ⏳ |
| PROD-045.2 | `generatePHash > should generate 16 character hex hash` | visual-search.service.spec.ts | Verifies correct hash format (64-bit as hex) | ⏳ |
| PROD-045.3 | `generatePHash > should generate different hashes for different images` | visual-search.service.spec.ts | Verifies distinct images produce different hashes | ⏳ |
| PROD-045.4 | `generatePHash > should generate similar hashes for similar images` | visual-search.service.spec.ts | Verifies perceptual similarity detection | ⏳ |
| PROD-045.5 | `generatePHash > should handle different image sizes` | visual-search.service.spec.ts | Verifies size-invariant hashing | ⏳ |
| PROD-045.6 | `generatePHash > should handle non-square images` | visual-search.service.spec.ts | Verifies aspect ratio handling in hashing | ⏳ |
| PROD-045.7 | `calculatePHashSimilarity > should return 1.0 for identical hashes` | visual-search.service.spec.ts | Verifies identical hash detection | ⏳ |
| PROD-045.8 | `calculatePHashSimilarity > should return 0.0 for completely different hashes` | visual-search.service.spec.ts | Verifies maximum difference detection | ⏳ |
| PROD-045.9 | `calculatePHashSimilarity > should be symmetric` | visual-search.service.spec.ts | Verifies similarity is bidirectional | ⏳ |
| PROD-045.10 | `extractDominantColors > should extract colors from solid color image` | visual-search.service.spec.ts | Verifies color extraction works | ⏳ |
| PROD-045.11 | `extractDominantColors > should return hex color format` | visual-search.service.spec.ts | Verifies colors are in #RRGGBB format | ⏳ |
| PROD-045.12 | `extractDominantColors > should extract up to 5 colors` | visual-search.service.spec.ts | Verifies color limit | ⏳ |
| PROD-045.13 | `calculateColorSimilarity > should return 1.0 for identical color arrays` | visual-search.service.spec.ts | Verifies identical color detection | ⏳ |
| PROD-045.14 | `calculateColorSimilarity > should return low similarity for different colors` | visual-search.service.spec.ts | Verifies color difference detection | ⏳ |
| PROD-045.15 | `calculateAspectRatioSimilarity > should return 1.0 for identical ratios` | visual-search.service.spec.ts | Verifies identical aspect ratio detection | ⏳ |
| PROD-045.16 | `calculateAspectRatioSimilarity > should be symmetric` | visual-search.service.spec.ts | Verifies ratio comparison is bidirectional | ⏳ |
| PROD-045.17 | `calculateBrightness > should return high brightness for white image` | visual-search.service.spec.ts | Verifies brightness calculation for bright images | ⏳ |
| PROD-045.18 | `calculateBrightness > should return low brightness for black image` | visual-search.service.spec.ts | Verifies brightness calculation for dark images | ⏳ |
| PROD-045.19 | `extractImageFeatures > should extract all features from image` | visual-search.service.spec.ts | Verifies complete feature extraction | ⏳ |
| PROD-045.20 | `extractImageFeatures > should throw for invalid image` | visual-search.service.spec.ts | Verifies error handling for invalid images | ⏳ |
| PROD-045.21 | `validateImageFile > should throw for missing file` | visual-search.service.spec.ts | Verifies file validation | ⏳ |
| PROD-045.22 | `validateImageFile > should throw for unsupported format` | visual-search.service.spec.ts | Verifies format validation (JPEG/PNG/WebP/GIF only) | ⏳ |
| PROD-045.23 | `validateImageFile > should throw for file too large` | visual-search.service.spec.ts | Verifies 10MB file size limit | ⏳ |
| PROD-045.24 | `findSimilarProperties > should return empty when no indexed images` | visual-search.service.spec.ts | Verifies empty result handling | ⏳ |
| PROD-045.25 | `findSimilarProperties > should find similar properties` | visual-search.service.spec.ts | Verifies similarity search works | ⏳ |
| PROD-045.26 | `findSimilarProperties > should filter by minimum similarity` | visual-search.service.spec.ts | Verifies minSimilarity filter | ⏳ |
| PROD-045.27 | `findSimilarProperties > should respect limit parameter` | visual-search.service.spec.ts | Verifies result limit | ⏳ |
| PROD-045.28 | `findSimilarProperties > should include visual match details` | visual-search.service.spec.ts | Verifies detailed similarity breakdown | ⏳ |
| PROD-045.29 | `findSimilarProperties > should include explanation` | visual-search.service.spec.ts | Verifies human-readable explanation | ⏳ |
| PROD-045.30 | `indexPropertyImages > should skip already indexed images` | visual-search.service.spec.ts | Verifies idempotent indexing | ⏳ |
| PROD-045.31 | `getIndexingStats > should return correct statistics` | visual-search.service.spec.ts | Verifies indexing statistics | ⏳ |
| PROD-045.32 | `isImageIndexed > should return true for indexed image` | visual-search.service.spec.ts | Verifies index check | ⏳ |
| PROD-045.E2E.1 | `POST /api/visual-search > should require authentication` | search.e2e-spec.ts | E2E: Verifies auth requirement | ⏳ |
| PROD-045.E2E.2 | `POST /api/visual-search > should reject without image` | search.e2e-spec.ts | E2E: Verifies file required | ⏳ |
| PROD-045.E2E.3 | `POST /api/visual-search > should reject non-image file` | search.e2e-spec.ts | E2E: Verifies file type validation | ⏳ |
| PROD-045.E2E.4 | `POST /api/visual-search > should accept valid JPEG` | search.e2e-spec.ts | E2E: Verifies successful search | ⏳ |
| PROD-045.E2E.5 | `POST /api/visual-search > should respect limit param` | search.e2e-spec.ts | E2E: Verifies limit query param | ⏳ |
| PROD-045.E2E.6 | `POST /api/visual-search > should respect minSimilarity param` | search.e2e-spec.ts | E2E: Verifies similarity filter | ⏳ |
| PROD-045.E2E.7 | `POST /api/visual-search > should return image features` | search.e2e-spec.ts | E2E: Verifies feature extraction in response | ⏳ |
| PROD-045.E2E.8 | `GET /api/visual-search/stats > should require auth` | search.e2e-spec.ts | E2E: Verifies auth requirement | ⏳ |
| PROD-045.E2E.9 | `GET /api/visual-search/stats > should return stats` | search.e2e-spec.ts | E2E: Verifies stats endpoint | ⏳ |

### PROD-046 to PROD-047: Advanced Search Features (Future)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-046 | N/A | N/A | AR property discovery - Future feature | 🚧 |
| PROD-047 | N/A | N/A | Lifestyle matching - Future feature | 🚧 |

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
| PROD-050.1 | `trackView > should track property view` | browsing-history.service.spec.ts | Verifies property view tracking | ✅ |
| PROD-050.2 | `getHistory > should return history` | browsing-history.service.spec.ts | Verifies browsing history retrieval | ✅ |
| PROD-050.3 | `getRecommendations > should return recommendations` | recommendations.service.spec.ts | Verifies AI-powered recommendations | ✅ |
| PROD-050.4 | `getRecommendations > with browsing history` | recommendations.service.spec.ts | Verifies history-based scoring | ✅ |
| PROD-050.5 | `getRecommendations > with favorites` | recommendations.service.spec.ts | Verifies favorite-based preferences | ✅ |
| PROD-050.6 | `getRecommendations > with search agents` | recommendations.service.spec.ts | Verifies search agent preferences | ✅ |
| PROD-050.7 | `getSimilarProperties > returns similar` | recommendations.service.spec.ts | Verifies similar property matching | ✅ |
| PROD-050.8 | `submitFeedback > creates feedback` | recommendations.service.spec.ts | Verifies recommendation feedback | ✅ |
| PROD-050.9 | `getUserPreferences > extracts preferences` | recommendations.service.spec.ts | Verifies preference extraction | ✅ |
| PROD-050.10 | `scoring > weights by engagement` | recommendations.service.spec.ts | Verifies engagement scoring | ✅ |
| PROD-050.11 | `explanations > generates correctly` | recommendations.service.spec.ts | Verifies recommendation explanations | ✅ |

### PROD-080: Platform Services Landing Pages

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-080.1 | `listProviders > should list approved providers` | insurance-provider.service.spec.ts | Verifies insurance provider directory only shows approved providers | ✅ |
| PROD-080.2 | `listProviders > should filter by insurance type` | insurance-provider.service.spec.ts | Verifies filtering by HOME, RENTERS, etc. | ✅ |
| PROD-080.3 | `listProviders > should filter by coverage area` | insurance-provider.service.spec.ts | Verifies geographic filtering for coverage | ✅ |
| PROD-080.4 | `listProviders > should filter by platform partners only` | insurance-provider.service.spec.ts | Verifies platform partner flag filter | ✅ |
| PROD-080.5 | `togglePlatformPartner > should toggle platform partner status` | insurance-provider.service.spec.ts | Verifies admin can set partner status | ✅ |
| PROD-080.6 | `listProviders > should list approved providers` | mortgage-provider.service.spec.ts | Verifies mortgage provider directory only shows approved providers | ✅ |
| PROD-080.7 | `listProviders > should filter by product type` | mortgage-provider.service.spec.ts | Verifies filtering by FIXED_30, FIXED_15, ARM, etc. | ✅ |
| PROD-080.8 | `listProviders > should filter by lending area` | mortgage-provider.service.spec.ts | Verifies geographic filtering for lending areas | ✅ |
| PROD-080.9 | `listProviders > should filter by platform partners only` | mortgage-provider.service.spec.ts | Verifies platform partner flag filter for mortgage | ✅ |
| PROD-080.10 | `togglePlatformPartner > should toggle platform partner status` | mortgage-provider.service.spec.ts | Verifies admin can set mortgage partner status | ✅ |

### PROD-081: Provider Applications

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-081.1 | `applyAsProvider > should create a new insurance provider application` | insurance-provider.service.spec.ts | Verifies insurance provider application creates PENDING record | ✅ |
| PROD-081.2 | `applyAsProvider > should throw ConflictException if user already has a provider profile` | insurance-provider.service.spec.ts | Verifies one provider profile per user | ✅ |
| PROD-081.3 | `applyAsProvider > should create a new mortgage provider application` | mortgage-provider.service.spec.ts | Verifies mortgage provider application creates PENDING record | ✅ |
| PROD-081.4 | `applyAsProvider > should throw ConflictException if user already has a provider profile` | mortgage-provider.service.spec.ts | Verifies one mortgage profile per user | ✅ |
| PROD-081.5 | `updateProviderStatus > should update provider status` | insurance-provider.service.spec.ts | Verifies admin can approve/reject applications | ✅ |
| PROD-081.6 | `updateProviderStatus > should set approvedAt and approvedBy when approving` | insurance-provider.service.spec.ts | Verifies approval audit trail | ✅ |
| PROD-081.7 | `updateProviderStatus > should update provider status` | mortgage-provider.service.spec.ts | Verifies admin can approve/reject mortgage applications | ✅ |
| PROD-081.8 | `listPendingApplications > should list pending applications` | insurance-provider.service.spec.ts | Verifies admin can view pending insurance apps | ✅ |
| PROD-081.9 | `listPendingApplications > should list pending applications` | mortgage-provider.service.spec.ts | Verifies admin can view pending mortgage apps | ✅ |

### PROD-082: Provider Profiles & Inquiries

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-082.1 | `getProviderById > should return provider by ID` | insurance-provider.service.spec.ts | Verifies insurance provider detail page data retrieval | ✅ |
| PROD-082.2 | `getProviderById > should throw NotFoundException if provider not found` | insurance-provider.service.spec.ts | Verifies 404 for invalid provider | ✅ |
| PROD-082.3 | `updateProvider > should update provider profile` | insurance-provider.service.spec.ts | Verifies provider can update their own profile | ✅ |
| PROD-082.4 | `updateProvider > should throw ForbiddenException if user is not the provider owner` | insurance-provider.service.spec.ts | Verifies only owner can update profile | ✅ |
| PROD-082.5 | `getProviderById > should return provider by ID` | mortgage-provider.service.spec.ts | Verifies mortgage provider detail page data | ✅ |
| PROD-082.6 | `getProviderById > should throw NotFoundException if provider not found` | mortgage-provider.service.spec.ts | Verifies 404 for invalid mortgage provider | ✅ |
| PROD-082.7 | `updateProvider > should update provider profile` | mortgage-provider.service.spec.ts | Verifies mortgage provider can update profile | ✅ |
| PROD-082.8 | `updateProvider > should throw ForbiddenException if user is not the provider owner` | mortgage-provider.service.spec.ts | Verifies only owner can update mortgage profile | ✅ |
| PROD-082.9 | `updateRates > should update mortgage rates` | mortgage-provider.service.spec.ts | Verifies provider can update current rates | ✅ |
| PROD-082.10 | `updateRates > should throw ForbiddenException if user is not the provider owner` | mortgage-provider.service.spec.ts | Verifies only owner can update rates | ✅ |
| PROD-082.11 | `createInsuranceInquiry > should create an insurance inquiry` | provider-inquiry.service.spec.ts | Verifies users can send inquiries to insurance providers | ✅ |
| PROD-082.12 | `createInsuranceInquiry > should throw NotFoundException if provider not found` | provider-inquiry.service.spec.ts | Verifies provider validation on inquiry | ✅ |
| PROD-082.13 | `createInsuranceInquiry > should throw BadRequestException if provider is not approved` | provider-inquiry.service.spec.ts | Verifies only approved providers receive inquiries | ✅ |
| PROD-082.14 | `createMortgageInquiry > should create a mortgage inquiry` | provider-inquiry.service.spec.ts | Verifies users can send inquiries to mortgage providers | ✅ |
| PROD-082.15 | `getInquiryById > should return inquiry for the inquirer` | provider-inquiry.service.spec.ts | Verifies inquirer can view their inquiry | ✅ |
| PROD-082.16 | `getInquiryById > should mark as viewed when provider views` | provider-inquiry.service.spec.ts | Verifies inquiry status updates to VIEWED | ✅ |
| PROD-082.17 | `getInquiryById > should throw ForbiddenException for unauthorized user` | provider-inquiry.service.spec.ts | Verifies inquiry privacy | ✅ |
| PROD-082.18 | `respondToInquiry > should allow provider to respond` | provider-inquiry.service.spec.ts | Verifies provider can respond to inquiries | ✅ |
| PROD-082.19 | `respondToInquiry > should throw ForbiddenException if not the provider` | provider-inquiry.service.spec.ts | Verifies only assigned provider can respond | ✅ |
| PROD-082.20 | `respondToInquiry > should throw BadRequestException if already responded` | provider-inquiry.service.spec.ts | Verifies one response per inquiry | ✅ |
| PROD-082.21 | `submitFeedback > should allow user to submit feedback` | provider-inquiry.service.spec.ts | Verifies users can rate provider responses | ✅ |
| PROD-082.22 | `submitFeedback > should throw ForbiddenException if not the inquirer` | provider-inquiry.service.spec.ts | Verifies only inquirer can submit feedback | ✅ |
| PROD-082.23 | `submitFeedback > should throw BadRequestException if not yet responded` | provider-inquiry.service.spec.ts | Verifies feedback only after response | ✅ |
| PROD-082.24 | `submitFeedback > should throw BadRequestException if feedback already submitted` | provider-inquiry.service.spec.ts | Verifies one feedback per inquiry | ✅ |
| PROD-082.25 | `listUserInquiries > should list user inquiries` | provider-inquiry.service.spec.ts | Verifies users can view their sent inquiries | ✅ |
| PROD-082.26 | `listUserInquiries > should filter by provider type` | provider-inquiry.service.spec.ts | Verifies filtering by insurance/mortgage | ✅ |
| PROD-082.27 | `listProviderInquiries > should list provider received inquiries` | provider-inquiry.service.spec.ts | Verifies providers can view received inquiries | ✅ |
| PROD-082.28 | `listProviderInquiries > should throw NotFoundException if provider profile not found` | provider-inquiry.service.spec.ts | Verifies provider profile requirement | ✅ |
| PROD-082.29 | `updateProviderMetrics > should update provider metrics` | insurance-provider.service.spec.ts | Verifies rating/review metrics update | ✅ |

### PROD-083: Mortgage Calculator

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-083.1 | `calculateMortgage > should calculate monthly payment correctly` | mortgage-calculator.service.spec.ts | Verifies principal+interest formula with price, down payment, rate, term inputs | ✅ |
| PROD-083.2 | `calculateMortgage > should handle different term lengths` | mortgage-calculator.service.spec.ts | Verifies 15-year vs 30-year comparison works | ✅ |
| PROD-083.3 | `calculateMortgage > should handle 0% interest rate` | mortgage-calculator.service.spec.ts | Verifies edge case of zero interest | ✅ |
| PROD-083.4 | `calculateMortgage > should calculate down payment percentage correctly` | mortgage-calculator.service.spec.ts | Verifies percentage calculation | ✅ |
| PROD-083.5 | `calculateMortgage > should include propertyId when provided` | mortgage-calculator.service.spec.ts | Verifies property context in response | ✅ |
| PROD-083.6 | `calculateMortgage > should handle small down payments` | mortgage-calculator.service.spec.ts | Verifies FHA-style 3.5% down payment | ✅ |
| PROD-083.7 | `calculateForProperty > should fetch property price and calculate mortgage` | mortgage-calculator.service.spec.ts | Verifies property page embedded calculator | ✅ |
| PROD-083.8 | `calculateForProperty > should throw NotFoundException if property not found` | mortgage-calculator.service.spec.ts | Verifies property validation | ✅ |
| PROD-083.9 | `calculateForProperty > should throw NotFoundException if property has no price` | mortgage-calculator.service.spec.ts | Verifies price exists | ✅ |
| PROD-083.10 | `generateAmortizationSchedule > should generate correct number of payments` | mortgage-calculator.service.spec.ts | Verifies 360 payments for 30-year term | ✅ |
| PROD-083.11 | `generateAmortizationSchedule > should have first payment with correct structure` | mortgage-calculator.service.spec.ts | Verifies principal/interest split | ✅ |
| PROD-083.12 | `generateAmortizationSchedule > should have last payment reduce balance to zero` | mortgage-calculator.service.spec.ts | Verifies loan is fully paid off | ✅ |
| PROD-083.13 | `generateAmortizationSchedule > should have principal portion increase over time` | mortgage-calculator.service.spec.ts | Verifies amortization pattern | ✅ |
| PROD-083.14 | `generateAmortizationSchedule > should calculate cumulative totals correctly` | mortgage-calculator.service.spec.ts | Verifies running totals | ✅ |
| PROD-083.15 | `generateAmortizationSchedule > should generate yearly summary` | mortgage-calculator.service.spec.ts | Verifies annual breakdown table | ✅ |
| PROD-083.16 | `generateAmortizationForProperty > should generate amortization schedule for property` | mortgage-calculator.service.spec.ts | Verifies property-specific schedule | ✅ |
| PROD-083.17 | `generateAmortizationForProperty > should throw NotFoundException if property not found` | mortgage-calculator.service.spec.ts | Verifies property validation | ✅ |
| PROD-083.18 | `calculateAffordability > should calculate maximum affordable home price` | mortgage-calculator.service.spec.ts | Verifies DTI-based affordability | ✅ |
| PROD-083.19 | `calculateAffordability > should use custom DTI ratio when provided` | mortgage-calculator.service.spec.ts | Verifies configurable DTI | ✅ |
| PROD-083.20 | `calculateAffordability > should handle high existing debt` | mortgage-calculator.service.spec.ts | Verifies debt impact calculation | ✅ |
| PROD-083.21 | `calculateAffordability > should return zero when debt exceeds DTI limit` | mortgage-calculator.service.spec.ts | Verifies edge case handling | ✅ |
| PROD-083.22 | `compareMortgages > should compare multiple mortgage scenarios` | mortgage-calculator.service.spec.ts | Verifies scenario comparison | ✅ |
| PROD-083.23 | `compareMortgages > should recommend lowest total cost option` | mortgage-calculator.service.spec.ts | Verifies recommendation logic | ✅ |
| PROD-083.24 | `compareMortgages > should show 15-year has lower total interest than 30-year` | mortgage-calculator.service.spec.ts | Verifies interest comparison | ✅ |
| PROD-083.25 | `getDefaultScenarios > should return default scenarios with 20% down payment` | mortgage-calculator.service.spec.ts | Verifies property-specific defaults | ✅ |
| PROD-083.26 | `getDefaultScenarios > should throw NotFoundException if property not found` | mortgage-calculator.service.spec.ts | Verifies property validation | ✅ |
| PROD-083.27 | `getDefaultScenarios > should throw NotFoundException if property has no price` | mortgage-calculator.service.spec.ts | Verifies price exists | ✅ |

### PROD-150: Location Information

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-150.1 | `getNeighborhoodData > should fetch fresh data if cache is expired` | neighborhood.service.spec.ts | Verifies neighborhood data fetching from APIs | ✅ |
| PROD-150.2 | `getNeighborhoodData > should return cached data if available` | neighborhood.service.spec.ts | Verifies interactive map data via cache | ✅ |
| PROD-150.3 | `getAmenities > should return nearby amenities` | neighborhood.service.spec.ts | Verifies nearby amenities display | ✅ |
| PROD-150.4 | `getNeighborhoodData > should include AI-generated description` | neighborhood.service.spec.ts | Verifies AI neighborhood summary | ✅ |

### PROD-151: School Data

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-151.1 | `getSchools > should return nearby schools` | neighborhood.service.spec.ts | Verifies school data integration | ✅ |
| PROD-151.2 | `getSchools > should include school ratings` | neighborhood.service.spec.ts | Verifies numeric school ratings | ✅ |
| PROD-151.3 | `getSchools > should group schools by level` | neighborhood.service.spec.ts | Verifies elementary/middle/high grouping | ✅ |
| PROD-151.4 | `getSchools > should filter by school level` | neighborhood.service.spec.ts | Verifies level filtering | ✅ |
| PROD-151.5 | `getSchools > should include distance and walking time` | neighborhood.service.spec.ts | Verifies walking/driving times | ✅ |
| PROD-151.6 | `getSchools > should filter by minimum rating` | neighborhood.service.spec.ts | Verifies rating threshold filter | ✅ |

### PROD-152: Safety Data

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-152.1 | `getNeighborhoodData > safety > crimeRating` | neighborhood.service.spec.ts | Verifies crime data API integration | ✅ |
| PROD-152.2 | `Safety Data > should return safety score` | neighborhood.service.spec.ts | Verifies composite safety score | ✅ |
| PROD-152.3 | `Safety Data > should return crime statistics` | neighborhood.service.spec.ts | Verifies crime types and frequencies | ✅ |

### PROD-153: Mobility Scores

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-153.1 | `getNeighborhoodData > mobilityScores` | neighborhood.service.spec.ts | Verifies Walk Score API integration | ✅ |
| PROD-153.2 | `Mobility Scores > should return walk score 0-100` | neighborhood.service.spec.ts | Verifies walk score display | ✅ |
| PROD-153.3 | `Mobility Scores > should return transit score 0-100` | neighborhood.service.spec.ts | Verifies transit score display | ✅ |
| PROD-153.4 | `Mobility Scores > should return bike score 0-100` | neighborhood.service.spec.ts | Verifies bike score display | ✅ |
| PROD-153.5 | `getAmenities > should include transit info` | neighborhood.service.spec.ts | Verifies public transport nearby | ✅ |
| PROD-153.6 | `Mobility Scores > should include score descriptions` | neighborhood.service.spec.ts | Verifies score explanations | ✅ |

### PROD-154: Demographics

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-154.1 | `getNeighborhoodData > demographics` | neighborhood.service.spec.ts | Verifies census data integration | ✅ |
| PROD-154.2 | `Demographics > should return demographic data` | neighborhood.service.spec.ts | Verifies population demographics | ✅ |
| PROD-154.3 | `Demographics > should include income data` | neighborhood.service.spec.ts | Verifies median household income | ✅ |

### PROD-155: Environmental Data

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-155.1 | `Environmental Data > should include noise level` | neighborhood.service.spec.ts | Verifies noise level API | ✅ |
| PROD-155.2 | `Environmental Data > should include air quality` | neighborhood.service.spec.ts | Verifies air quality API | ✅ |
| PROD-155.3 | `Environmental Data > should return environmental data` | neighborhood.service.spec.ts | Verifies environmental metrics display | ✅ |

### PROD-156: Climate Risk

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-156.1 | `getClimateRisk > should include flood zone information` | neighborhood.service.spec.ts | Verifies FEMA flood zone data | ✅ |
| PROD-156.2 | `getClimateRisk > should include fire risk` | neighborhood.service.spec.ts | Verifies fire risk data | ✅ |
| PROD-156.3 | `getClimateRisk > should include earthquake risk` | neighborhood.service.spec.ts | Verifies earthquake risk data | ✅ |
| PROD-156.4 | `getClimateRisk > should calculate overall risk score` | neighborhood.service.spec.ts | Verifies composite climate risk score | ✅ |
| PROD-156.5 | `getClimateRisk > should return climate risk data` | neighborhood.service.spec.ts | Verifies map overlays data | ✅ |
| PROD-156.6 | `getClimateRisk > should include insurance implications` | neighborhood.service.spec.ts | Verifies insurance link/notes | ✅ |

### PROD-157: Future Development

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-157.1 | `getFutureDevelopments > should return future development projects` | neighborhood.service.spec.ts | Verifies development data source | ✅ |
| PROD-157.2 | `getFutureDevelopments > developments include infrastructure` | neighborhood.service.spec.ts | Verifies planned infrastructure data | ✅ |
| PROD-157.3 | `getFutureDevelopments > developments include commercial` | neighborhood.service.spec.ts | Verifies commercial development data | ✅ |
| PROD-157.4 | `getFutureDevelopments > should include distance from location` | neighborhood.service.spec.ts | Verifies map markers with distance | ✅ |
| PROD-157.5 | `getFutureDevelopments > should include project timeline` | neighborhood.service.spec.ts | Verifies expected completion dates | ✅ |

### PROD-158: Amenity Walkability

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-158.1 | `getAmenities > should filter by category` | neighborhood.service.spec.ts | Verifies specific amenity search | ✅ |
| PROD-158.2 | `getWalkability > should calculate walking times by category` | neighborhood.service.spec.ts | Verifies Google Directions API | ✅ |
| PROD-158.3 | `getWalkability > should return nearest amenity per category` | neighborhood.service.spec.ts | Verifies nearest by category | ✅ |
| PROD-158.4 | `getWalkability > should count amenities within 10 minutes walk` | neighborhood.service.spec.ts | Verifies walking time display | ✅ |
| PROD-158.5 | `getAmenities > should include walking time` | neighborhood.service.spec.ts | Verifies minutes to each amenity | ✅ |

### Property Neighborhood Profile

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-150-158.1 | `getPropertyNeighborhoodProfile > should return complete profile` | neighborhood.service.spec.ts | Verifies complete neighborhood data for property | ✅ |
| PROD-150-158.2 | `getPropertyNeighborhoodProfile > should throw if property not found` | neighborhood.service.spec.ts | Verifies property validation | ✅ |
| PROD-150-158.3 | `getPropertyNeighborhoodProfile > should throw if no coordinates` | neighborhood.service.spec.ts | Verifies location requirement | ✅ |
| PROD-150-158.4 | `getPropertyNeighborhoodProfile > should include all data types` | neighborhood.service.spec.ts | Verifies comprehensive data | ✅ |

---

## Financial Tools (PROD-160 to PROD-169)

### PROD-160: AI Property Valuation

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-160.1 | `getPropertyValuation > should generate new valuation for property` | financial-tools.service.spec.ts | ✅ |
| PROD-160.2 | `getPropertyValuation > should throw NotFoundException for non-existent property` | financial-tools.service.spec.ts | ✅ |
| PROD-160.3 | `getPropertyValuation > should return cached valuation if recent` | financial-tools.service.spec.ts | ✅ |
| PROD-160.4 | `getPropertyValuation > should use specified valuation method` | financial-tools.service.spec.ts | ✅ |

### PROD-161: Price Analytics

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-161.1 | `getPriceHistory > should return price history for property` | financial-tools.service.spec.ts | ✅ |
| PROD-161.2 | `getPriceHistory > should create initial history entry if none exists` | financial-tools.service.spec.ts | ✅ |
| PROD-161.3 | `getPriceHistory > should throw NotFoundException for non-existent property` | financial-tools.service.spec.ts | ✅ |
| PROD-161.4 | `getPriceHistory > should filter by date range` | financial-tools.service.spec.ts | ✅ |

### PROD-162: Investment Calculators

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-162.1 | `calculateRoi > should calculate ROI metrics correctly` | financial-tools.service.spec.ts | ✅ |
| PROD-162.2 | `calculateRoi > should handle zero down payment` | financial-tools.service.spec.ts | ✅ |
| PROD-162.3 | `calculateRoi > should apply vacancy rate to income` | financial-tools.service.spec.ts | ✅ |
| PROD-162.4 | `calculateMortgage > should calculate mortgage payment correctly` | financial-tools.service.spec.ts | ✅ |
| PROD-162.5 | `calculateMortgage > should include PMI when specified` | financial-tools.service.spec.ts | ✅ |
| PROD-162.6 | `calculateMortgage > should include escrow amounts` | financial-tools.service.spec.ts | ✅ |
| PROD-162.7 | `calculateMortgage > should handle zero interest rate` | financial-tools.service.spec.ts | ✅ |
| PROD-162.8 | `calculateMortgage > should generate amortization summary by year` | financial-tools.service.spec.ts | ✅ |

### PROD-163: Rental Yield Calculator

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-163.1 | `calculateRentalYield > should calculate gross and net yield` | financial-tools.service.spec.ts | ✅ |
| PROD-163.2 | `calculateRentalYield > should throw error for zero purchase price` | financial-tools.service.spec.ts | ✅ |
| PROD-163.3 | `calculateRentalYield > should handle zero expenses` | financial-tools.service.spec.ts | ✅ |

### PROD-164: Depreciation Calculator

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-164.1 | `calculateDepreciation > should calculate residential depreciation (27.5 years)` | financial-tools.service.spec.ts | ✅ |
| PROD-164.2 | `calculateDepreciation > should calculate commercial depreciation (39 years)` | financial-tools.service.spec.ts | ✅ |
| PROD-164.3 | `calculateDepreciation > should include improvement costs in basis` | financial-tools.service.spec.ts | ✅ |
| PROD-164.4 | `calculateDepreciation > should use default land value of 20%` | financial-tools.service.spec.ts | ✅ |

### PROD-165: Portfolio Tracker

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-165.1 | `createPortfolio > should create new portfolio` | financial-tools.service.spec.ts | ✅ |
| PROD-165.2 | `getPortfolios > should return user portfolios` | financial-tools.service.spec.ts | ✅ |
| PROD-165.3 | `getPortfolioById > should return portfolio with metrics` | financial-tools.service.spec.ts | ✅ |
| PROD-165.4 | `getPortfolioById > should throw NotFoundException for non-existent portfolio` | financial-tools.service.spec.ts | ✅ |
| PROD-165.5 | `deletePortfolio > should delete portfolio` | financial-tools.service.spec.ts | ✅ |
| PROD-165.6 | `deletePortfolio > should throw NotFoundException for non-existent portfolio` | financial-tools.service.spec.ts | ✅ |
| PROD-165.7 | `addPropertyToPortfolio > should add property to portfolio` | financial-tools.service.spec.ts | ✅ |
| PROD-165.8 | `addPropertyToPortfolio > should throw NotFoundException for non-existent property` | financial-tools.service.spec.ts | ✅ |
| PROD-165.9 | `addPropertyToPortfolio > should throw BadRequestException if property already in portfolio` | financial-tools.service.spec.ts | ✅ |
| PROD-165.10 | `removePropertyFromPortfolio > should remove property from portfolio` | financial-tools.service.spec.ts | ✅ |
| PROD-165.11 | `removePropertyFromPortfolio > should throw NotFoundException if property not in portfolio` | financial-tools.service.spec.ts | ✅ |

### PROD-166: Loan Comparison

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-166.1 | `compareLoanOptions > should compare multiple loan options` | financial-tools.service.spec.ts | ✅ |
| PROD-166.2 | `compareLoanOptions > should rank by total cost` | financial-tools.service.spec.ts | ✅ |
| PROD-166.3 | `compareLoanOptions > should calculate effective rate` | financial-tools.service.spec.ts | ✅ |

### PROD-167: Down Payment Assistance

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-167.1 | `findDownPaymentPrograms > should return matching programs` | financial-tools.service.spec.ts | ✅ |
| PROD-167.2 | `findDownPaymentPrograms > should mark ineligible based on income` | financial-tools.service.spec.ts | ✅ |
| PROD-167.3 | `findDownPaymentPrograms > should mark ineligible for non-first-time buyers` | financial-tools.service.spec.ts | ✅ |

### PROD-168: Tax Reporting

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-168.1 | `generateTaxReport > should generate tax report for year` | financial-tools.service.spec.ts | ✅ |
| PROD-168.2 | `generateTaxReport > should return existing report if already generated` | financial-tools.service.spec.ts | ✅ |
| PROD-168.3 | `getTaxReports > should return user tax reports` | financial-tools.service.spec.ts | ✅ |

### PROD-169: Cash Flow Projection

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-169.1 | `createCashFlowProjection > should create cash flow projection` | financial-tools.service.spec.ts | ✅ |
| PROD-169.2 | `createCashFlowProjection > should throw NotFoundException for non-existent property` | financial-tools.service.spec.ts | ✅ |
| PROD-169.3 | `createCashFlowProjection > should apply vacancy rate to income` | financial-tools.service.spec.ts | ✅ |
| PROD-169.4 | `createCashFlowProjection > should apply growth rates over time` | financial-tools.service.spec.ts | ✅ |
| PROD-169.5 | `getCashFlowProjections > should return projections for property` | financial-tools.service.spec.ts | ✅ |

---

## Profit-Sharing & Revenue Distribution

### Platform Configuration

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROFIT-001.1 | `getActiveConfig > should return active config if exists` | revenue-share.service.spec.ts | ✅ |
| PROFIT-001.2 | `getActiveConfig > should create default config if none exists` | revenue-share.service.spec.ts | ✅ |
| PROFIT-001.3 | `updateConfig > should update config with valid percentages` | revenue-share.service.spec.ts | ✅ |
| PROFIT-001.4 | `updateConfig > should throw error if %A + %B + %C != 100` | revenue-share.service.spec.ts | ✅ |
| PROFIT-001.5 | `updateConfig > should throw error if %D + %E + %F != %B` | revenue-share.service.spec.ts | ✅ |
| PROFIT-001.6 | `updateConfig > should validate network breakdown equals user network total` | revenue-share.service.spec.ts | ✅ |

### Wallet Management

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROFIT-002.1 | `getOrCreateWallet > should return existing wallet` | revenue-share.service.spec.ts | ✅ |
| PROFIT-002.2 | `getOrCreateWallet > should create wallet if none exists` | revenue-share.service.spec.ts | ✅ |
| PROFIT-002.3 | `getWalletTransactions > should return transaction history` | revenue-share.service.spec.ts | ✅ |
| PROFIT-002.4 | `getWalletTransactions > should return empty array if no wallet` | revenue-share.service.spec.ts | ✅ |

### Revenue Distribution

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROFIT-003.1 | `distributeRevenue > should throw error if already distributed` | revenue-share.service.spec.ts | ✅ |
| PROFIT-003.2 | `distributeRevenue > should throw error if transaction not found` | revenue-share.service.spec.ts | ✅ |
| PROFIT-003.3 | `distributeRevenue > should throw error if transaction not completed` | revenue-share.service.spec.ts | ✅ |
| PROFIT-003.4 | `distributeRevenue > should create distribution with correct amounts` | revenue-share.service.spec.ts | ✅ |
| PROFIT-003.5 | `getDistributionById > should return distribution with shares` | revenue-share.service.spec.ts | ✅ |
| PROFIT-003.6 | `getDistributionById > should throw error if distribution not found` | revenue-share.service.spec.ts | ✅ |
| PROFIT-003.7 | `upstream network > should distribute to multiple upstream levels` | revenue-share.service.spec.ts | ✅ |

### Payout Management

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROFIT-004.1 | `requestPayout > should create payout request with valid amount` | revenue-share.service.spec.ts | ✅ |
| PROFIT-004.2 | `requestPayout > should throw error if wallet not found` | revenue-share.service.spec.ts | ✅ |
| PROFIT-004.3 | `requestPayout > should throw error if insufficient balance` | revenue-share.service.spec.ts | ✅ |
| PROFIT-004.4 | `requestPayout > should throw error if below minimum payout amount` | revenue-share.service.spec.ts | ✅ |
| PROFIT-004.5 | `requestPayout > should throw error if pending payout exists` | revenue-share.service.spec.ts | ✅ |
| PROFIT-004.6 | `processPayout > should process pending payout` | revenue-share.service.spec.ts | ✅ |
| PROFIT-004.7 | `processPayout > should throw error if payout not found` | revenue-share.service.spec.ts | ✅ |
| PROFIT-004.8 | `processPayout > should throw error if payout not pending` | revenue-share.service.spec.ts | ✅ |
| PROFIT-004.9 | `cancelPayout > should cancel own pending payout and refund` | revenue-share.service.spec.ts | ✅ |
| PROFIT-004.10 | `cancelPayout > should throw error if not owner` | revenue-share.service.spec.ts | ✅ |
| PROFIT-004.11 | `cancelPayout > should throw error if payout not pending` | revenue-share.service.spec.ts | ✅ |

### Statistics

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROFIT-005.1 | `getRevenueStats > should return aggregated revenue stats` | revenue-share.service.spec.ts | ✅ |
| PROFIT-005.2 | `getUserEarningsStats > should return user earnings breakdown` | revenue-share.service.spec.ts | ✅ |
| PROFIT-005.3 | `getUserEarningsStats > should return zeros if no wallet` | revenue-share.service.spec.ts | ✅ |

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

### NFR-014: Multi-Factor Authentication (MFA)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| NFR-014.1 | `should be defined` | mfa.service.spec.ts | Verifies MFA service initialization | ✅ |
| NFR-014.2 | `setupMfa > should generate secret, QR code, and backup codes for new setup` | mfa.service.spec.ts | Verifies TOTP secret generation and QR code creation | ✅ |
| NFR-014.3 | `setupMfa > should throw NotFoundException if user not found` | mfa.service.spec.ts | Verifies user validation during setup | ✅ |
| NFR-014.4 | `setupMfa > should throw BadRequestException if MFA is already enabled and verified` | mfa.service.spec.ts | Prevents duplicate MFA setup | ✅ |
| NFR-014.5 | `setupMfa > should allow re-setup if previous setup was not verified` | mfa.service.spec.ts | Allows retry of incomplete MFA setup | ✅ |
| NFR-014.6 | `verifySetup > should enable MFA when valid TOTP code is provided` | mfa.service.spec.ts | Verifies TOTP validation enables MFA | ✅ |
| NFR-014.7 | `verifySetup > should throw NotFoundException if user not found` | mfa.service.spec.ts | Verifies user validation during verification | ✅ |
| NFR-014.8 | `verifySetup > should throw BadRequestException if MFA setup not initiated` | mfa.service.spec.ts | Prevents verification without setup | ✅ |
| NFR-014.9 | `verifySetup > should throw BadRequestException if MFA already verified` | mfa.service.spec.ts | Prevents duplicate verification | ✅ |
| NFR-014.10 | `verifySetup > should throw UnauthorizedException for invalid TOTP code` | mfa.service.spec.ts | Rejects invalid TOTP codes | ✅ |
| NFR-014.11 | `createPendingSession > should create a pending session with token and expiry` | mfa.service.spec.ts | Verifies MFA login session creation | ✅ |
| NFR-014.12 | `createPendingSession > should clean up expired sessions for user` | mfa.service.spec.ts | Verifies session cleanup | ✅ |
| NFR-014.13 | `verifyLogin > should return tokens for valid TOTP code` | mfa.service.spec.ts | Completes login with valid MFA | ✅ |
| NFR-014.14 | `verifyLogin > should throw UnauthorizedException for invalid session token` | mfa.service.spec.ts | Rejects invalid MFA session tokens | ✅ |
| NFR-014.15 | `verifyLogin > should throw UnauthorizedException for expired session` | mfa.service.spec.ts | Rejects expired MFA sessions | ✅ |
| NFR-014.16 | `verifyLogin > should throw UnauthorizedException for invalid TOTP code` | mfa.service.spec.ts | Rejects invalid TOTP during login | ✅ |
| NFR-014.17 | `verifyLogin > should allow login with valid backup code` | mfa.service.spec.ts | Verifies backup code authentication | ✅ |
| NFR-014.18 | `getStatus > should return MFA status when enabled` | mfa.service.spec.ts | Returns correct enabled status | ✅ |
| NFR-014.19 | `getStatus > should return disabled status when MFA not enabled` | mfa.service.spec.ts | Returns correct disabled status | ✅ |
| NFR-014.20 | `getStatus > should throw NotFoundException if user not found` | mfa.service.spec.ts | Validates user for status check | ✅ |
| NFR-014.21 | `regenerateBackupCodes > should generate new backup codes with valid password` | mfa.service.spec.ts | Allows backup code regeneration | ✅ |
| NFR-014.22 | `regenerateBackupCodes > should throw NotFoundException if user not found` | mfa.service.spec.ts | Validates user for backup code regen | ✅ |
| NFR-014.23 | `regenerateBackupCodes > should throw BadRequestException if MFA not enabled` | mfa.service.spec.ts | Requires MFA for backup regen | ✅ |
| NFR-014.24 | `regenerateBackupCodes > should throw UnauthorizedException for invalid password` | mfa.service.spec.ts | Validates password for backup regen | ✅ |
| NFR-014.25 | `disable > should disable MFA with valid password and TOTP code` | mfa.service.spec.ts | Allows MFA disabling with verification | ✅ |
| NFR-014.26 | `disable > should throw NotFoundException if user not found` | mfa.service.spec.ts | Validates user for MFA disable | ✅ |
| NFR-014.27 | `disable > should throw BadRequestException if MFA not enabled` | mfa.service.spec.ts | Prevents disabling already-disabled MFA | ✅ |
| NFR-014.28 | `disable > should throw UnauthorizedException for invalid password` | mfa.service.spec.ts | Validates password for MFA disable | ✅ |
| NFR-014.29 | `disable > should throw UnauthorizedException for invalid TOTP code` | mfa.service.spec.ts | Validates TOTP for MFA disable | ✅ |
| NFR-014.30 | `isMfaEnabled > should return true when MFA is enabled` | mfa.service.spec.ts | Correctly detects MFA enabled | ✅ |
| NFR-014.31 | `isMfaEnabled > should return false when MFA is not enabled` | mfa.service.spec.ts | Correctly detects MFA disabled | ✅ |
| NFR-014.32 | `isMfaEnabled > should return false when user not found` | mfa.service.spec.ts | Handles missing user gracefully | ✅ |
| NFR-014.33 | `backup code format > should generate backup codes without confusing characters` | mfa.service.spec.ts | Ensures backup codes are user-friendly | ✅ |

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

### PROD-096: Split Payments

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-096.1 | `createSplitPayment > should create split payment for transaction` | split-payment.service.spec.ts | Verifies split payment can be created with multiple participants | ✅ |
| PROD-096.2 | `createSplitPayment > should throw NotFoundException if transaction not found` | split-payment.service.spec.ts | Verifies transaction validation | ✅ |
| PROD-096.3 | `createSplitPayment > should throw ForbiddenException if user not buyer` | split-payment.service.spec.ts | Verifies only buyer can initiate split payment | ✅ |
| PROD-096.4 | `createSplitPayment > should throw BadRequestException if splits don't total 100%` | split-payment.service.spec.ts | Verifies percentage validation | ✅ |
| PROD-096.5 | `createSplitPayment > should throw BadRequestException if transaction already has split` | split-payment.service.spec.ts | Verifies no duplicate split payments | ✅ |
| PROD-096.6 | `createSplitPayment > should generate unique payment tokens for each participant` | split-payment.service.spec.ts | Verifies secure token generation | ✅ |
| PROD-096.7 | `createSplitPayment > should send payment link emails to participants` | split-payment.service.spec.ts | Verifies email notification on creation | ✅ |
| PROD-096.8 | `getSplitPayment > should return split payment by ID` | split-payment.service.spec.ts | Verifies retrieval functionality | ✅ |
| PROD-096.9 | `getSplitPayment > should throw NotFoundException if not found` | split-payment.service.spec.ts | Verifies not found handling | ✅ |
| PROD-096.10 | `getSplitPayment > should throw ForbiddenException if user not authorized` | split-payment.service.spec.ts | Verifies access control | ✅ |
| PROD-096.11 | `getPaymentLinks > should return all payment links for split payment` | split-payment.service.spec.ts | Verifies payment link retrieval | ✅ |
| PROD-096.12 | `getPaymentByToken > should return payment link by token` | split-payment.service.spec.ts | Verifies token-based lookup | ✅ |
| PROD-096.13 | `getPaymentByToken > should throw NotFoundException for invalid token` | split-payment.service.spec.ts | Verifies token validation | ✅ |
| PROD-096.14 | `processPayment > should process individual participant payment` | split-payment.service.spec.ts | Verifies partial payment processing | ✅ |
| PROD-096.15 | `processPayment > should throw BadRequestException if already paid` | split-payment.service.spec.ts | Verifies idempotent payment handling | ✅ |
| PROD-096.16 | `processPayment > should update payment link status to PAID` | split-payment.service.spec.ts | Verifies status tracking | ✅ |
| PROD-096.17 | `completePayment > should complete split payment when all paid` | split-payment.service.spec.ts | Verifies automatic completion detection | ✅ |
| PROD-096.18 | `completePayment > should not complete if payments pending` | split-payment.service.spec.ts | Verifies partial state handling | ✅ |
| PROD-096.19 | `sendReminders > should send reminder emails to unpaid participants` | split-payment.service.spec.ts | Verifies reminder functionality | ✅ |
| PROD-096.20 | `sendReminders > should not send reminders to paid participants` | split-payment.service.spec.ts | Verifies selective reminder logic | ✅ |
| PROD-096.21 | `cancelSplitPayment > should cancel split payment` | split-payment.service.spec.ts | Verifies cancellation | ✅ |
| PROD-096.22 | `cancelSplitPayment > should throw ForbiddenException if not initiator` | split-payment.service.spec.ts | Verifies only initiator can cancel | ✅ |
| PROD-096.23 | `cancelSplitPayment > should throw BadRequestException if already completed` | split-payment.service.spec.ts | Verifies completed payments can't be cancelled | ✅ |
| PROD-096.24 | `cancelSplitPayment > should refund already paid participants` | split-payment.service.spec.ts | Verifies refund on cancellation | ✅ |
| PROD-096.25 | `getUserSplitPayments > should return user's split payments` | split-payment.service.spec.ts | Verifies user-specific listing | ✅ |
| PROD-096.26 | `getUserSplitPayments > should paginate results` | split-payment.service.spec.ts | Verifies pagination support | ✅ |
| PROD-096.27 | `getUserSplitPayments > should filter by status` | split-payment.service.spec.ts | Verifies status filtering | ✅ |

### PROD-097: Escrow Services

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-097.1 | `createEscrow > should create escrow for transaction` | escrow.service.spec.ts | Verifies escrow creation with milestones | ✅ |
| PROD-097.2 | `createEscrow > should throw NotFoundException if transaction not found` | escrow.service.spec.ts | Verifies transaction validation | ✅ |
| PROD-097.3 | `createEscrow > should throw ForbiddenException if user not buyer or seller` | escrow.service.spec.ts | Verifies party authorization | ✅ |
| PROD-097.4 | `createEscrow > should throw BadRequestException if transaction already has escrow` | escrow.service.spec.ts | Verifies no duplicate escrows | ✅ |
| PROD-097.5 | `createEscrow > should throw BadRequestException if milestone amounts don't match` | escrow.service.spec.ts | Verifies milestone sum validation | ✅ |
| PROD-097.6 | `createEscrow > should create escrow without milestones (threshold-based)` | escrow.service.spec.ts | Verifies threshold-based escrow | ✅ |
| PROD-097.7 | `createEscrow > should send notification to both parties` | escrow.service.spec.ts | Verifies escrow creation notifications | ✅ |
| PROD-097.8 | `getEscrow > should return escrow by ID` | escrow.service.spec.ts | Verifies escrow retrieval | ✅ |
| PROD-097.9 | `getEscrow > should throw NotFoundException if not found` | escrow.service.spec.ts | Verifies not found handling | ✅ |
| PROD-097.10 | `getEscrow > should throw ForbiddenException if user not authorized` | escrow.service.spec.ts | Verifies access control | ✅ |
| PROD-097.11 | `getEscrow > should include milestones in response` | escrow.service.spec.ts | Verifies milestone data inclusion | ✅ |
| PROD-097.12 | `fundEscrow > should fund escrow with partial amount` | escrow.service.spec.ts | Verifies partial funding | ✅ |
| PROD-097.13 | `fundEscrow > should throw ForbiddenException if not buyer` | escrow.service.spec.ts | Verifies buyer-only funding | ✅ |
| PROD-097.14 | `fundEscrow > should throw BadRequestException if already fully funded` | escrow.service.spec.ts | Verifies funding limit | ✅ |
| PROD-097.15 | `fundEscrow > should throw BadRequestException if amount exceeds remaining` | escrow.service.spec.ts | Verifies overfunding prevention | ✅ |
| PROD-097.16 | `fundEscrow > should update funded amount correctly` | escrow.service.spec.ts | Verifies amount tracking | ✅ |
| PROD-097.17 | `completeFunding > should mark escrow as FUNDED when fully funded` | escrow.service.spec.ts | Verifies status transition | ✅ |
| PROD-097.18 | `completeFunding > should not change status if partially funded` | escrow.service.spec.ts | Verifies partial funding state | ✅ |
| PROD-097.19 | `completeFunding > should send notification on full funding` | escrow.service.spec.ts | Verifies funding completion notification | ✅ |
| PROD-097.20 | `completeMilestone > should mark milestone as completed by seller` | escrow.service.spec.ts | Verifies milestone completion | ✅ |
| PROD-097.21 | `completeMilestone > should throw ForbiddenException if not seller` | escrow.service.spec.ts | Verifies seller-only completion | ✅ |
| PROD-097.22 | `completeMilestone > should throw BadRequestException if milestone already completed` | escrow.service.spec.ts | Verifies idempotent completion | ✅ |
| PROD-097.23 | `completeMilestone > should throw BadRequestException if escrow not funded` | escrow.service.spec.ts | Verifies escrow state validation | ✅ |
| PROD-097.24 | `completeMilestone > should allow evidence submission` | escrow.service.spec.ts | Verifies evidence attachment | ✅ |
| PROD-097.25 | `completeMilestone > should send notification to buyer for approval` | escrow.service.spec.ts | Verifies approval notification | ✅ |
| PROD-097.26 | `approveMilestoneRelease > should release funds to seller` | escrow.service.spec.ts | Verifies fund release | ✅ |
| PROD-097.27 | `approveMilestoneRelease > should throw ForbiddenException if not buyer` | escrow.service.spec.ts | Verifies buyer-only approval | ✅ |
| PROD-097.28 | `approveMilestoneRelease > should throw BadRequestException if not completed` | escrow.service.spec.ts | Verifies completion requirement | ✅ |
| PROD-097.29 | `approveMilestoneRelease > should throw BadRequestException if already released` | escrow.service.spec.ts | Verifies no double release | ✅ |
| PROD-097.30 | `approveMilestoneRelease > should update releasedAmount` | escrow.service.spec.ts | Verifies release tracking | ✅ |
| PROD-097.31 | `approveMilestoneRelease > should allow approval notes` | escrow.service.spec.ts | Verifies notes attachment | ✅ |
| PROD-097.32 | `approveMilestoneRelease > should complete escrow when all released` | escrow.service.spec.ts | Verifies automatic completion | ✅ |
| PROD-097.33 | `raiseDispute > should create dispute on escrow` | escrow.service.spec.ts | Verifies dispute creation | ✅ |
| PROD-097.34 | `raiseDispute > should throw ForbiddenException if not party` | escrow.service.spec.ts | Verifies party-only disputes | ✅ |
| PROD-097.35 | `raiseDispute > should throw BadRequestException if escrow completed` | escrow.service.spec.ts | Verifies dispute timing | ✅ |
| PROD-097.36 | `raiseDispute > should throw BadRequestException if dispute exists` | escrow.service.spec.ts | Verifies single active dispute | ✅ |
| PROD-097.37 | `raiseDispute > should change escrow status to DISPUTED` | escrow.service.spec.ts | Verifies status transition | ✅ |
| PROD-097.38 | `raiseDispute > should notify both parties and admin` | escrow.service.spec.ts | Verifies dispute notifications | ✅ |
| PROD-097.39 | `resolveDispute > should resolve dispute with buyer refund` | escrow.service.spec.ts | Verifies buyer refund resolution | ✅ |
| PROD-097.40 | `resolveDispute > should resolve dispute with seller release` | escrow.service.spec.ts | Verifies seller release resolution | ✅ |
| PROD-097.41 | `resolveDispute > should resolve dispute with split resolution` | escrow.service.spec.ts | Verifies split fund resolution | ✅ |
| PROD-097.42 | `resolveDispute > should throw ForbiddenException if not admin` | escrow.service.spec.ts | Verifies admin-only resolution | ✅ |
| PROD-097.43 | `resolveDispute > should notify both parties of resolution` | escrow.service.spec.ts | Verifies resolution notifications | ✅ |
| PROD-097.44 | `releaseFullEscrow > should release all funds at once` | escrow.service.spec.ts | Verifies full release (threshold-based) | ✅ |
| PROD-097.45 | `cancelEscrow > should cancel unfunded escrow` | escrow.service.spec.ts | Verifies cancellation | ✅ |
| PROD-097.46 | `cancelEscrow > should refund buyer if funds present` | escrow.service.spec.ts | Verifies refund on cancel | ✅ |
| PROD-097.47 | `getDisputes > should return all disputes (admin)` | escrow.service.spec.ts | Verifies admin dispute listing | ✅ |

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
| MSG-007.3 | `sendMessage > should send notifications to other participants` | messaging.service.spec.ts | Verifies in-app notification created for recipients (PROD-200.7) | ✅ |
| MSG-007.4 | `sendMessage > should send email notification to other participants` | messaging.service.spec.ts | Verifies email notification sent via MailService (PROD-200.7) | ✅ |
| MSG-007.5 | `sendMessage > should emit WebSocket notification event` | messaging.service.spec.ts | Verifies real-time WebSocket notification for online users (PROD-200.7) | ✅ |
| MSG-007.6 | `sendMessage > should not notify the sender` | messaging.service.spec.ts | Verifies sender is excluded from notifications | ✅ |
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
| MSG-E2E-001 | `POST /conversations > should require authentication` | messaging.e2e-spec.ts | Verifies auth required | ✅ |
| MSG-E2E-002 | `POST /conversations > should create direct conversation` | messaging.e2e-spec.ts | Verifies conversation creation with recipient | ✅ |
| MSG-E2E-003 | `POST /conversations > should create with initial message` | messaging.e2e-spec.ts | Verifies initial message support | ✅ |
| MSG-E2E-004 | `POST /conversations > should create property-linked conversation` | messaging.e2e-spec.ts | Verifies property inquiry conversation | ✅ |
| MSG-E2E-005 | `POST /conversations > should create negotiation-linked conversation` | messaging.e2e-spec.ts | Verifies negotiation messaging | ✅ |
| MSG-E2E-006 | `GET /conversations > should list user conversations` | messaging.e2e-spec.ts | Verifies conversation listing | ✅ |
| MSG-E2E-007 | `GET /conversations > should support pagination` | messaging.e2e-spec.ts | Verifies pagination params | ✅ |
| MSG-E2E-008 | `GET /conversations/:id > should return with messages` | messaging.e2e-spec.ts | Verifies conversation detail | ✅ |
| MSG-E2E-009 | `GET /conversations/:id > should reject non-participants` | messaging.e2e-spec.ts | Verifies participant authorization | ✅ |
| MSG-E2E-010 | `GET /negotiations/:id/conversation > should return negotiation conversation` | messaging.e2e-spec.ts | Verifies negotiation messaging endpoint | ✅ |
| MSG-E2E-011 | `POST /conversations/:id/messages > should send message` | messaging.e2e-spec.ts | Verifies message sending | ✅ |
| MSG-E2E-012 | `POST /conversations/:id/messages > should reject empty messages` | messaging.e2e-spec.ts | Verifies message validation | ✅ |
| MSG-E2E-013 | `POST /conversations/:id/messages > should reject non-participants` | messaging.e2e-spec.ts | Verifies send authorization | ✅ |
| MSG-E2E-014 | `GET /conversations/:id/messages > should return paginated messages` | messaging.e2e-spec.ts | Verifies message listing | ✅ |
| MSG-E2E-015 | `PATCH /conversations/:id/read > should mark as read` | messaging.e2e-spec.ts | Verifies read status | ✅ |
| MSG-E2E-016 | `GET /unread-count > should return unread count` | messaging.e2e-spec.ts | Verifies unread aggregation | ✅ |
| MSG-E2E-017 | `PATCH /conversations/:id/archive > should archive conversation` | messaging.e2e-spec.ts | Verifies archive functionality | ✅ |
| MSG-E2E-018 | `PATCH /conversations/:id/unarchive > should unarchive` | messaging.e2e-spec.ts | Verifies unarchive functionality | ✅ |
| MSG-E2E-019 | `DELETE /messages/:id > should delete own message` | messaging.e2e-spec.ts | Verifies message deletion | ✅ |
| MSG-E2E-020 | `Full Messaging Flow > complete conversation flow` | messaging.e2e-spec.ts | Verifies end-to-end messaging | ✅ |

### Messaging Browser Tests (Playwright)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| MSG-PW-001 | `Messages Page > should display messages page from sidebar` | messaging.spec.ts | Verifies sidebar navigation to messages | ✅ |
| MSG-PW-002 | `Messages Page > should show empty state when no conversations` | messaging.spec.ts | Verifies empty state display | ✅ |
| MSG-PW-003 | `Messages Page > should navigate to conversation detail` | messaging.spec.ts | Verifies conversation click navigation | ✅ |
| MSG-PW-004 | `Conversation List > should display conversation items` | messaging.spec.ts | Verifies conversation list rendering | ✅ |
| MSG-PW-005 | `Conversation List > should show last message preview` | messaging.spec.ts | Verifies message preview in list | ✅ |
| MSG-PW-006 | `Conversation List > should indicate unread conversations` | messaging.spec.ts | Verifies unread badge display | ✅ |
| MSG-PW-007 | `Message Thread > should display messages chronologically` | messaging.spec.ts | Verifies message ordering | ✅ |
| MSG-PW-008 | `Message Thread > should distinguish sent/received messages` | messaging.spec.ts | Verifies message alignment/styling | ✅ |
| MSG-PW-009 | `Message Thread > should scroll to bottom on new message` | messaging.spec.ts | Verifies auto-scroll behavior | ✅ |
| MSG-PW-010 | `Message Input > should have message input field` | messaging.spec.ts | Verifies input field presence | ✅ |
| MSG-PW-011 | `Message Input > should send message on button click` | messaging.spec.ts | Verifies send button functionality | ✅ |
| MSG-PW-012 | `Message Input > should send message on Enter key` | messaging.spec.ts | Verifies keyboard shortcut | ✅ |
| MSG-PW-013 | `Message Input > should not send empty messages` | messaging.spec.ts | Verifies empty message validation | ✅ |
| MSG-PW-014 | `Message Input > should disable send while sending` | messaging.spec.ts | Verifies send button state | ✅ |
| MSG-PW-015 | `Typing Indicator > should show when other user types` | messaging.spec.ts | Verifies typing indicator display | ✅ |
| MSG-PW-016 | `Real-time Messages > should receive messages in real-time` | messaging.spec.ts | Verifies WebSocket message delivery | ✅ |
| MSG-PW-017 | `Mobile Bottom Nav > should display messages icon` | messaging.spec.ts | Verifies mobile navigation | ✅ |
| MSG-PW-018 | `Mobile Bottom Nav > should show unread badge` | messaging.spec.ts | Verifies mobile unread indicator | ✅ |
| MSG-PW-019 | `Mobile Bottom Nav > should navigate to messages` | messaging.spec.ts | Verifies mobile navigation click | ✅ |
| MSG-PW-020 | `Negotiation Messages Tab > should display messages tab` | messaging.spec.ts | Verifies negotiation messaging integration | ✅ |
| MSG-PW-021 | `Negotiation Messages Tab > should show message thread` | messaging.spec.ts | Verifies negotiation message display | ✅ |
| MSG-PW-022 | `Negotiation Messages Tab > should send messages` | messaging.spec.ts | Verifies negotiation message sending | ✅ |
| MSG-PW-023 | `Accessibility > message input should have proper label` | messaging.spec.ts | Verifies ARIA accessibility | ✅ |
| MSG-PW-024 | `Accessibility > messages should be keyboard navigable` | messaging.spec.ts | Verifies keyboard navigation | ✅ |
| MSG-PW-025 | `Accessibility > send button should have accessible name` | messaging.spec.ts | Verifies button accessibility | ✅ |
| MSG-PW-026 | `Error Handling > should show error when message fails` | messaging.spec.ts | Verifies error toast display | ✅ |
| MSG-PW-027 | `Error Handling > should handle 404 conversation not found` | messaging.spec.ts | Verifies 404 handling | ✅ |
| MSG-PW-028 | `Loading States > should show loading for conversations` | messaging.spec.ts | Verifies loading skeleton | ✅ |
| MSG-PW-029 | `Loading States > should show loading for messages` | messaging.spec.ts | Verifies message loading state | ✅ |

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
| PROD-101.3.1 | `create > should create a rental application successfully` | applications.service.spec.ts | Verifies application creation with employment info | ✅ |
| PROD-101.3.2 | `create > should throw NotFoundException if property not found` | applications.service.spec.ts | Verifies error for non-existent property | ✅ |
| PROD-101.3.3 | `create > should throw ForbiddenException when applying to own property` | applications.service.spec.ts | Verifies owner cannot apply to own property | ✅ |
| PROD-101.3.4 | `create > should throw BadRequestException if property is not for rent` | applications.service.spec.ts | Verifies only rental properties accept applications | ✅ |
| PROD-101.3.5 | `create > should throw ConflictException if already applied` | applications.service.spec.ts | Verifies duplicate application prevention | ✅ |
| PROD-101.3.6 | `createApplication > should call service.create with correct parameters` | applications.controller.spec.ts | Verifies controller delegates to service | ✅ |
| PROD-101.3 | `POST /properties/:propertyId/apply > should create a rental application` | applications.e2e-spec.ts | E2E test of application submission | ✅ |
| PROD-101.3 | `POST /properties/:propertyId/apply > should fail when applying twice` | applications.e2e-spec.ts | E2E test of duplicate prevention | ✅ |
| PROD-101.3 | `POST /properties/:propertyId/apply > should fail for own property` | applications.e2e-spec.ts | E2E test of ownership check | ✅ |

### PROD-101.4: List Applications (GET /applications)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-101.4.1 | `getMyApplications > should return paginated applications` | applications.service.spec.ts | Verifies pagination of user's applications | ✅ |
| PROD-101.4.2 | `getMyApplications > should filter by status` | applications.service.spec.ts | Verifies status filtering | ✅ |
| PROD-101.4.3 | `getMyApplications > should call service with correct parameters` | applications.controller.spec.ts | Verifies controller delegates to service | ✅ |
| PROD-101.4 | `GET /applications > should return user applications` | applications.e2e-spec.ts | E2E test of applications listing | ✅ |
| PROD-101.4 | `GET /applications > should filter by status` | applications.e2e-spec.ts | E2E test of status filtering | ✅ |

### PROD-101.5: Application Status Tracking

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-101.5.1 | `review > should update application status` | applications.service.spec.ts | Verifies owner can change status | ✅ |
| PROD-101.5.2 | `review > should throw ForbiddenException for non-owner` | applications.service.spec.ts | Verifies only owner can review | ✅ |
| PROD-101.5.3 | `review > should throw BadRequestException for withdrawn applications` | applications.service.spec.ts | Verifies cannot review withdrawn | ✅ |
| PROD-101.5.4 | `withdraw > should withdraw application successfully` | applications.service.spec.ts | Verifies applicant can withdraw | ✅ |
| PROD-101.5.5 | `withdraw > should throw ForbiddenException for non-applicant` | applications.service.spec.ts | Verifies only applicant can withdraw | ✅ |
| PROD-101.5.6 | `withdraw > should throw BadRequestException for non-withdrawable status` | applications.service.spec.ts | Verifies cannot withdraw approved/rejected | ✅ |
| PROD-101.5 | `PATCH /applications/:id/review > should allow owner to set status` | applications.e2e-spec.ts | E2E test of status update by owner | ✅ |
| PROD-101.5 | `PATCH /applications/:id/withdraw > should allow applicant to withdraw` | applications.e2e-spec.ts | E2E test of application withdrawal | ✅ |

### PROD-101.6: Employment & References Storage

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-101.6.1 | Schema includes employment fields | prisma/schema.prisma | Verifies employmentStatus, employer, jobTitle, monthlyIncome fields | ✅ |
| PROD-101.6.2 | Schema includes references field (JSON) | prisma/schema.prisma | Verifies references stored as JSON array | ✅ |
| PROD-101.6.3 | DTO validates employment fields | applications.dto.ts | Verifies CreateApplicationDto with employment validation | ✅ |
| PROD-101.6 | `POST /properties/:id/apply > stores employment info` | applications.e2e-spec.ts | E2E test verifying employment data persisted | ✅ |

### Test Summary for PROD-101

| Test Type | Count | Status |
|-----------|-------|--------|
| Service Unit Tests | 27 | ✅ |
| Controller Unit Tests | 6 | ✅ |
| E2E Tests | 22 | ✅ |
| **Total** | **55** | ✅ |

*Last verified: 2025-12-31*

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
| Service Unit Tests (LeasesService) | 35 | ✅ |
| Service Unit Tests (RentReminderService) | 19 | ✅ |
| Service Unit Tests (LeaseRenewalService) | 30 | ✅ |
| Controller Unit Tests | 15 | ✅ |
| E2E Tests | 27 | ✅ |
| **Total** | **126** | ✅ |

*Last verified: 2025-12-31*

---

## 7.9 Maintenance Workflows (PROD-103)

### PROD-103.1: Schema and Model

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.1.1 | Schema includes MaintenanceRequest model | prisma/schema.prisma | Verifies model with tenant, landlord, property, lease, provider relations | ✅ |
| PROD-103.1.2 | Schema includes MaintenanceRequestType enum | prisma/schema.prisma | Verifies PLUMBING, ELECTRICAL, HVAC, etc. types | ✅ |
| PROD-103.1.3 | Schema includes MaintenanceRequestStatus enum | prisma/schema.prisma | Verifies SUBMITTED, APPROVED, REJECTED, etc. statuses | ✅ |
| PROD-103.1.4 | Schema includes MaintenancePriority enum | prisma/schema.prisma | Verifies LOW, NORMAL, URGENT, EMERGENCY priorities | ✅ |
| PROD-103.1.5 | NotificationType includes MAINTENANCE_REQUEST_* values | prisma/schema.prisma | Verifies all maintenance notification types | ✅ |

### PROD-103.2: Create Maintenance Request (POST /maintenance-requests)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.2.1 | `create > should create a maintenance request successfully` | maintenance.service.spec.ts | Verifies tenant can create request with active lease | ✅ |
| PROD-103.2.2 | `create > should throw NotFoundException if lease not found` | maintenance.service.spec.ts | Verifies error for non-existent lease | ✅ |
| PROD-103.2.3 | `create > should throw ForbiddenException if user is not the tenant` | maintenance.service.spec.ts | Verifies only lease tenant can create | ✅ |
| PROD-103.2.4 | `create > should throw BadRequestException if lease is not active` | maintenance.service.spec.ts | Verifies only active lease allows requests | ✅ |
| PROD-103.2.5 | `create > should call service.create with correct parameters` | maintenance.controller.spec.ts | Verifies controller passes user and DTO | ✅ |
| PROD-103.2 | `POST /maintenance-requests > should allow tenant to create` | maintenance.e2e-spec.ts | E2E test of request creation | ✅ |
| PROD-103.2 | `POST /maintenance-requests > should reject request from non-tenant` | maintenance.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-103.3: List Maintenance Requests (GET /maintenance-requests)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.3.1 | `findAll > should return paginated list for tenant` | maintenance.service.spec.ts | Verifies tenant sees own requests | ✅ |
| PROD-103.3.2 | `findAll > should return paginated list for landlord` | maintenance.service.spec.ts | Verifies landlord sees property requests | ✅ |
| PROD-103.3.3 | `findAll > should filter by status` | maintenance.service.spec.ts | Verifies status filtering works | ✅ |
| PROD-103.3.4 | `findAll > should return paginated list of requests` | maintenance.controller.spec.ts | Verifies controller returns correct format | ✅ |
| PROD-103.3 | `GET /maintenance-requests > should return for tenant` | maintenance.e2e-spec.ts | E2E test of tenant listing | ✅ |
| PROD-103.3 | `GET /maintenance-requests > should filter by status` | maintenance.e2e-spec.ts | E2E test of status filter | ✅ |

### PROD-103.4: Get Single Request (GET /maintenance-requests/:id)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.4.1 | `findOne > should return request for tenant` | maintenance.service.spec.ts | Verifies tenant can view own request | ✅ |
| PROD-103.4.2 | `findOne > should return request for landlord` | maintenance.service.spec.ts | Verifies landlord can view request | ✅ |
| PROD-103.4.3 | `findOne > should throw NotFoundException if request not found` | maintenance.service.spec.ts | Verifies error for missing request | ✅ |
| PROD-103.4.4 | `findOne > should throw ForbiddenException for unauthorized user` | maintenance.service.spec.ts | Verifies access control | ✅ |
| PROD-103.4 | `GET /maintenance-requests/:id > should return request details` | maintenance.e2e-spec.ts | E2E test of request details | ✅ |
| PROD-103.4 | `GET /maintenance-requests/:id > should deny unauthorized access` | maintenance.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-103.5: Update Request (PATCH /maintenance-requests/:id)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.5.1 | `update > should update request if tenant and status is SUBMITTED` | maintenance.service.spec.ts | Verifies tenant can update submitted request | ✅ |
| PROD-103.5.2 | `update > should throw ForbiddenException if not tenant` | maintenance.service.spec.ts | Verifies only tenant can update | ✅ |
| PROD-103.5.3 | `update > should throw BadRequestException if status is not SUBMITTED` | maintenance.service.spec.ts | Verifies only submitted requests editable | ✅ |
| PROD-103.5 | `PATCH /maintenance-requests/:id > should allow tenant to update` | maintenance.e2e-spec.ts | E2E test of update | ✅ |
| PROD-103.5 | `PATCH /maintenance-requests/:id > should reject update from landlord` | maintenance.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-103.6: Approve Request (POST /maintenance-requests/:id/approve)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.6.1 | `approve > should approve request if landlord and status is SUBMITTED` | maintenance.service.spec.ts | Verifies landlord can approve | ✅ |
| PROD-103.6.2 | `approve > should throw ForbiddenException if not landlord` | maintenance.service.spec.ts | Verifies only landlord can approve | ✅ |
| PROD-103.6.3 | `approve > should throw BadRequestException if status is not SUBMITTED` | maintenance.service.spec.ts | Verifies only submitted requests approvable | ✅ |
| PROD-103.6 | `POST /maintenance-requests/:id/approve > should allow landlord` | maintenance.e2e-spec.ts | E2E test of approval | ✅ |
| PROD-103.6 | `POST /maintenance-requests/:id/approve > should reject from tenant` | maintenance.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-103.7: Reject Request (POST /maintenance-requests/:id/reject)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.7.1 | `reject > should reject request if landlord and status is SUBMITTED` | maintenance.service.spec.ts | Verifies landlord can reject with reason | ✅ |
| PROD-103.7.2 | `reject > should throw ForbiddenException if not landlord` | maintenance.service.spec.ts | Verifies only landlord can reject | ✅ |
| PROD-103.7 | `POST /maintenance-requests/:id/reject > should allow landlord` | maintenance.e2e-spec.ts | E2E test of rejection | ✅ |

### PROD-103.8: Assign Provider (POST /maintenance-requests/:id/assign)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.8.1 | `assignProvider > should assign provider if landlord and status is APPROVED` | maintenance.service.spec.ts | Verifies provider assignment | ✅ |
| PROD-103.8.2 | `assignProvider > should throw NotFoundException if provider not found` | maintenance.service.spec.ts | Verifies error for missing provider | ✅ |
| PROD-103.8.3 | `assignProvider > should throw ForbiddenException if not landlord` | maintenance.service.spec.ts | Verifies only landlord can assign | ✅ |
| PROD-103.8 | `POST /maintenance-requests/:id/assign > should allow landlord` | maintenance.e2e-spec.ts | E2E test of provider assignment | ✅ |
| PROD-103.8 | `POST /maintenance-requests/:id/assign > should reject from tenant` | maintenance.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-103.9: Schedule Request (POST /maintenance-requests/:id/schedule)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.9.1 | `schedule > should schedule if landlord and status is ASSIGNED` | maintenance.service.spec.ts | Verifies scheduling with date/time | ✅ |
| PROD-103.9.2 | `schedule > should throw BadRequestException if status is not ASSIGNED` | maintenance.service.spec.ts | Verifies only assigned requests schedulable | ✅ |
| PROD-103.9 | `POST /maintenance-requests/:id/schedule > should allow scheduling` | maintenance.e2e-spec.ts | E2E test of scheduling | ✅ |

### PROD-103.10: Start Work (POST /maintenance-requests/:id/start)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.10.1 | `startWork > should start work if provider and status is SCHEDULED` | maintenance.service.spec.ts | Verifies provider can start work | ✅ |
| PROD-103.10.2 | `startWork > should throw ForbiddenException if not assigned provider` | maintenance.service.spec.ts | Verifies only assigned provider can start | ✅ |
| PROD-103.10 | `POST /maintenance-requests/:id/start > should allow provider` | maintenance.e2e-spec.ts | E2E test of starting work | ✅ |
| PROD-103.10 | `POST /maintenance-requests/:id/start > should reject from non-provider` | maintenance.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-103.11: Complete Work (POST /maintenance-requests/:id/complete)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.11.1 | `complete > should complete work if provider and status is IN_PROGRESS` | maintenance.service.spec.ts | Verifies provider can complete with notes/cost | ✅ |
| PROD-103.11.2 | `complete > should throw ForbiddenException if not assigned provider` | maintenance.service.spec.ts | Verifies only assigned provider can complete | ✅ |
| PROD-103.11 | `POST /maintenance-requests/:id/complete > should allow provider` | maintenance.e2e-spec.ts | E2E test of completion | ✅ |

### PROD-103.12: Confirm Completion (POST /maintenance-requests/:id/confirm)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.12.1 | `confirmCompletion > should allow tenant to confirm completion` | maintenance.service.spec.ts | Verifies tenant confirmation | ✅ |
| PROD-103.12.2 | `confirmCompletion > should allow landlord to confirm completion` | maintenance.service.spec.ts | Verifies landlord confirmation | ✅ |
| PROD-103.12.3 | `confirmCompletion > should set status to CONFIRMED when both parties confirm` | maintenance.service.spec.ts | Verifies final status change | ✅ |
| PROD-103.12.4 | `confirmCompletion > should throw ForbiddenException for unauthorized user` | maintenance.service.spec.ts | Verifies access control | ✅ |
| PROD-103.12 | `POST /maintenance-requests/:id/confirm > should allow tenant` | maintenance.e2e-spec.ts | E2E test of tenant confirmation | ✅ |
| PROD-103.12 | `POST /maintenance-requests/:id/confirm > should allow landlord and finalize` | maintenance.e2e-spec.ts | E2E test of landlord confirmation | ✅ |

### PROD-103.13: Cancel Request (POST /maintenance-requests/:id/cancel)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-103.13.1 | `cancel > should allow tenant to cancel SUBMITTED request` | maintenance.service.spec.ts | Verifies tenant can cancel own submitted request | ✅ |
| PROD-103.13.2 | `cancel > should allow landlord to cancel any cancellable request` | maintenance.service.spec.ts | Verifies landlord can cancel | ✅ |
| PROD-103.13.3 | `cancel > should throw BadRequestException for tenant cancelling non-SUBMITTED request` | maintenance.service.spec.ts | Verifies tenant limitation | ✅ |
| PROD-103.13.4 | `cancel > should throw BadRequestException for already completed request` | maintenance.service.spec.ts | Verifies completed cannot be cancelled | ✅ |
| PROD-103.13.5 | `cancel > should throw ForbiddenException for unauthorized user` | maintenance.service.spec.ts | Verifies access control | ✅ |
| PROD-103.13 | `POST /maintenance-requests/:id/cancel > should allow tenant` | maintenance.e2e-spec.ts | E2E test of tenant cancellation | ✅ |
| PROD-103.13 | `POST /maintenance-requests/:id/cancel > should allow landlord` | maintenance.e2e-spec.ts | E2E test of landlord cancellation | ✅ |
| PROD-103.13 | `POST /maintenance-requests/:id/cancel > should prevent tenant from cancelling approved` | maintenance.e2e-spec.ts | E2E test of status restriction | ✅ |

### Test Summary for PROD-103

| Test Type | Count | Status |
|-----------|-------|--------|
| Service Unit Tests (MaintenanceService) | 37 | ✅ |
| Controller Unit Tests | 12 | ✅ |
| E2E Tests | 18 | ✅ |
| **Total** | **67** | ✅ |

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
| PROD-105.1.1 | Schema includes LeaseRenewal model | prisma/schema.prisma | Verifies model with lease, landlord, tenant, newLease relations | ✅ |
| PROD-105.1.2 | Schema includes LeaseRenewalStatus enum | prisma/schema.prisma | Verifies PENDING, OFFERED, ACCEPTED, DECLINED, EXPIRED, CANCELLED statuses | ✅ |
| PROD-105.1.3 | NotificationType includes LEASE_RENEWAL_* values | prisma/schema.prisma | Verifies all lease renewal notification types | ✅ |

### PROD-105.2: Check Upcoming Renewals (Cron Job)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.2.1 | `checkUpcomingRenewals > should find leases ending in 60 days` | lease-renewal.service.spec.ts | Verifies cron job identifies expiring leases | ✅ |
| PROD-105.2.2 | `checkUpcomingRenewals > should create PENDING renewal records` | lease-renewal.service.spec.ts | Verifies renewal record is created for each lease | ✅ |
| PROD-105.2.3 | `checkUpcomingRenewals > should send notifications to landlords` | lease-renewal.service.spec.ts | Verifies landlord receives reminder notification | ✅ |
| PROD-105.2.4 | `checkUpcomingRenewals > should send emails to landlords` | lease-renewal.service.spec.ts | Verifies landlord receives reminder email | ✅ |
| PROD-105.2.5 | `checkUpcomingRenewals > should skip leases that already have renewal` | lease-renewal.service.spec.ts | Verifies no duplicate renewals created | ✅ |

### PROD-105.3: List Pending Renewals (GET /leases/renewals/pending)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.3.1 | `findPendingRenewals > should return paginated renewals for landlord` | lease-renewal.service.spec.ts | Verifies landlord sees their pending renewals | ✅ |
| PROD-105.3.2 | `findPendingRenewals > should filter by status` | lease-renewal.service.spec.ts | Verifies status filtering works | ✅ |
| PROD-105.3 | `GET /leases/renewals/pending > should return pending renewals` | lease-renewal.e2e-spec.ts | E2E test of pending renewals list | ✅ |

### PROD-105.4: Get Renewal for Lease (GET /leases/:id/renewal)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.4.1 | `findRenewalForLease > should return renewal for landlord` | lease-renewal.service.spec.ts | Verifies landlord can view renewal status | ✅ |
| PROD-105.4.2 | `findRenewalForLease > should return renewal for tenant` | lease-renewal.service.spec.ts | Verifies tenant can view renewal status | ✅ |
| PROD-105.4.3 | `findRenewalForLease > should throw NotFoundException if no renewal` | lease-renewal.service.spec.ts | Verifies error for missing renewal | ✅ |
| PROD-105.4.4 | `findRenewalForLease > should throw ForbiddenException for unauthorized` | lease-renewal.service.spec.ts | Verifies access control | ✅ |
| PROD-105.4 | `GET /leases/:id/renewal > should return renewal status` | lease-renewal.e2e-spec.ts | E2E test of renewal retrieval | ✅ |
| PROD-105.4 | `GET /leases/:id/renewal > should deny unauthorized access` | lease-renewal.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-105.5: Create Renewal Offer (POST /leases/:id/renewal/offer)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.5.1 | `createOffer > should create offer with proposed terms` | lease-renewal.service.spec.ts | Verifies landlord can set start/end dates and rent | ✅ |
| PROD-105.5.2 | `createOffer > should update status to OFFERED` | lease-renewal.service.spec.ts | Verifies status transition | ✅ |
| PROD-105.5.3 | `createOffer > should send notification to tenant` | lease-renewal.service.spec.ts | Verifies tenant receives offer notification | ✅ |
| PROD-105.5.4 | `createOffer > should send email to tenant` | lease-renewal.service.spec.ts | Verifies tenant receives offer email | ✅ |
| PROD-105.5.5 | `createOffer > should throw ForbiddenException if not landlord` | lease-renewal.service.spec.ts | Verifies only landlord can create offer | ✅ |
| PROD-105.5.6 | `createOffer > should throw BadRequestException if not PENDING` | lease-renewal.service.spec.ts | Verifies status must be PENDING | ✅ |
| PROD-105.5 | `POST /leases/:id/renewal/offer > should allow landlord` | lease-renewal.e2e-spec.ts | E2E test of offer creation | ✅ |
| PROD-105.5 | `POST /leases/:id/renewal/offer > should reject from tenant` | lease-renewal.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-105.6: Accept Renewal Offer (POST /leases/:id/renewal/accept)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.6.1 | `acceptOffer > should update status to ACCEPTED` | lease-renewal.service.spec.ts | Verifies status transition | ✅ |
| PROD-105.6.2 | `acceptOffer > should create new lease with proposed terms` | lease-renewal.service.spec.ts | Verifies new lease auto-generated | ✅ |
| PROD-105.6.3 | `acceptOffer > should link new lease to renewal record` | lease-renewal.service.spec.ts | Verifies newLeaseId is set | ✅ |
| PROD-105.6.4 | `acceptOffer > should send notifications to both parties` | lease-renewal.service.spec.ts | Verifies both landlord and tenant notified | ✅ |
| PROD-105.6.5 | `acceptOffer > should send emails to both parties` | lease-renewal.service.spec.ts | Verifies both receive acceptance email | ✅ |
| PROD-105.6.6 | `acceptOffer > should throw ForbiddenException if not tenant` | lease-renewal.service.spec.ts | Verifies only tenant can accept | ✅ |
| PROD-105.6.7 | `acceptOffer > should throw BadRequestException if not OFFERED` | lease-renewal.service.spec.ts | Verifies status must be OFFERED | ✅ |
| PROD-105.6 | `POST /leases/:id/renewal/accept > should allow tenant` | lease-renewal.e2e-spec.ts | E2E test of acceptance | ✅ |
| PROD-105.6 | `POST /leases/:id/renewal/accept > should create new lease` | lease-renewal.e2e-spec.ts | E2E test of lease generation | ✅ |
| PROD-105.6 | `POST /leases/:id/renewal/accept > should reject from landlord` | lease-renewal.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-105.7: Decline Renewal Offer (POST /leases/:id/renewal/decline)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.7.1 | `declineOffer > should update status to DECLINED` | lease-renewal.service.spec.ts | Verifies status transition | ✅ |
| PROD-105.7.2 | `declineOffer > should store decline reason` | lease-renewal.service.spec.ts | Verifies optional reason saved | ✅ |
| PROD-105.7.3 | `declineOffer > should send notification to landlord` | lease-renewal.service.spec.ts | Verifies landlord notified | ✅ |
| PROD-105.7.4 | `declineOffer > should send email to landlord` | lease-renewal.service.spec.ts | Verifies landlord receives decline email | ✅ |
| PROD-105.7.5 | `declineOffer > should throw ForbiddenException if not tenant` | lease-renewal.service.spec.ts | Verifies only tenant can decline | ✅ |
| PROD-105.7 | `POST /leases/:id/renewal/decline > should allow tenant` | lease-renewal.e2e-spec.ts | E2E test of decline | ✅ |
| PROD-105.7 | `POST /leases/:id/renewal/decline > should reject from landlord` | lease-renewal.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-105.8: Cancel Renewal Offer (DELETE /leases/:id/renewal)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.8.1 | `cancelOffer > should update status to CANCELLED` | lease-renewal.service.spec.ts | Verifies status transition | ✅ |
| PROD-105.8.2 | `cancelOffer > should throw ForbiddenException if not landlord` | lease-renewal.service.spec.ts | Verifies only landlord can cancel | ✅ |
| PROD-105.8.3 | `cancelOffer > should throw BadRequestException if already responded` | lease-renewal.service.spec.ts | Verifies cannot cancel after response | ✅ |
| PROD-105.8 | `DELETE /leases/:id/renewal > should allow landlord` | lease-renewal.e2e-spec.ts | E2E test of cancellation | ✅ |
| PROD-105.8 | `DELETE /leases/:id/renewal > should reject from tenant` | lease-renewal.e2e-spec.ts | E2E test of authorization | ✅ |

### PROD-105.9: Expire Offers (Cron Job)

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-105.9.1 | `expireOffers > should find offers past expiration date` | lease-renewal.service.spec.ts | Verifies cron job identifies expired offers | ✅ |
| PROD-105.9.2 | `expireOffers > should update status to EXPIRED` | lease-renewal.service.spec.ts | Verifies status transition | ✅ |
| PROD-105.9.3 | `expireOffers > should send notifications to both parties` | lease-renewal.service.spec.ts | Verifies both parties notified | ✅ |
| PROD-105.9.4 | `expireOffers > should send emails to both parties` | lease-renewal.service.spec.ts | Verifies both receive expiration email | ✅ |

### Test Summary for PROD-105

| Test Type | Count | Status |
|-----------|-------|--------|
| Service Unit Tests (LeaseRenewalService) | 20 | ✅ |
| E2E Tests | 15 | ✅ |
| **Total** | **35** | ✅ |

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

## 8. AI Tour Guide (PROD-120 to PROD-133)

### Overview

The AI Tour Guide module provides location-based tour narration with voice styles, POI detection, custom tours, saved places, and user notes. All 106 unit tests pass.

### PROD-120: Location-Based Service

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-120.1 | `getNearbyPois > should return mock POIs when no API key is configured` | poi.service.spec.ts | Verifies POI detection returns nearby points of interest | ✅ |
| PROD-120.2 | `getNearbyPois > should include distance in results` | poi.service.spec.ts | Verifies distance calculation for each POI | ✅ |
| PROD-120.3 | `calculateDistance > should calculate distance between two points` | poi.service.spec.ts | Verifies Haversine formula for distance | ✅ |
| PROD-120.4 | `calculateDistance > should return 0 for same point` | poi.service.spec.ts | Verifies edge case for same location | ✅ |
| PROD-120.5 | `calculateDistance > should calculate roughly correct distance` | poi.service.spec.ts | Verifies ~1km distance calculation accuracy | ✅ |

### PROD-121: POI Detection

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-121.1 | `getNearbyPois > should filter mock POIs by type` | poi.service.spec.ts | Verifies POI type filtering (restaurants, museums, etc.) | ✅ |
| PROD-121.2 | `getNearbyPois > should respect the limit parameter` | poi.service.spec.ts | Verifies result limiting | ✅ |
| PROD-121.3 | `mapGoogleTypesToPoiType > should map restaurant type correctly` | poi.service.spec.ts | Verifies Google type mapping | ✅ |
| PROD-121.4 | `mapGoogleTypesToPoiType > should map park type correctly` | poi.service.spec.ts | Verifies park type mapping | ✅ |
| PROD-121.5 | `mapGoogleTypesToPoiType > should map museum type correctly` | poi.service.spec.ts | Verifies museum type mapping | ✅ |
| PROD-121.6 | `mapGoogleTypesToPoiType > should map landmark type correctly` | poi.service.spec.ts | Verifies landmark type mapping | ✅ |
| PROD-121.7 | `mapGoogleTypesToPoiType > should return OTHER for unknown types` | poi.service.spec.ts | Verifies fallback for unknown types | ✅ |
| PROD-121.8 | `mapGoogleTypesToPoiType > should prioritize first matching type` | poi.service.spec.ts | Verifies type priority order | ✅ |

### PROD-122: POI Coverage

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-122.1 | `getPoiDetails > should return mock POI details when no API key is configured` | poi.service.spec.ts | Verifies detailed POI info retrieval | ✅ |
| PROD-122.2 | `getPoiDetails > should include opening hours in details` | poi.service.spec.ts | Verifies opening hours data | ✅ |

### PROD-123: Voice Information / PROD-127: Voice Styles

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-123.1 | `generateNarration > should generate narration for a POI` | narration.service.spec.ts | Verifies narration generation | ✅ |
| PROD-123.2 | `generateNarration > should throw NotFoundException for non-existent POI` | narration.service.spec.ts | Verifies error handling | ✅ |
| PROD-123.3 | `generateNarration > should calculate estimated speaking duration` | narration.service.spec.ts | Verifies duration calculation | ✅ |
| PROD-123.4 | `generateNarration > should include interests in response` | narration.service.spec.ts | Verifies interest-based content | ✅ |
| PROD-127.1 | `buildNarration > should use FRIENDLY voice style template` | narration.service.spec.ts | Verifies FRIENDLY voice narration | ✅ |
| PROD-127.2 | `buildNarration > should use HISTORICAL voice style template` | narration.service.spec.ts | Verifies HISTORICAL voice narration | ✅ |
| PROD-127.3 | `buildNarration > should use PROFESSIONAL voice style template` | narration.service.spec.ts | Verifies PROFESSIONAL voice narration | ✅ |
| PROD-127.4 | `buildNarration > should include rating information` | narration.service.spec.ts | Verifies rating in narration | ✅ |
| PROD-127.5 | `buildNarration > should include open/closed status` | narration.service.spec.ts | Verifies open status in narration | ✅ |
| PROD-127.6 | `buildNarration > should handle closed status` | narration.service.spec.ts | Verifies closed status in narration | ✅ |
| PROD-127.7 | `buildNarration > should include interest-specific content` | narration.service.spec.ts | Verifies interest-based content inclusion | ✅ |

### PROD-124: Audio Navigation

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-124.1 | `generateNavigationNarration > should generate navigation instruction in FRIENDLY style` | narration.service.spec.ts | Verifies navigation narration | ✅ |
| PROD-124.2 | `generateNavigationNarration > should convert to kilometers for long distances` | narration.service.spec.ts | Verifies km conversion for 1000m+ | ✅ |
| PROD-124.3 | `generateNavigationNarration > should use HISTORICAL style template` | narration.service.spec.ts | Verifies historical nav style | ✅ |
| PROD-124.4 | `generateNavigationNarration > should use PROFESSIONAL style template` | narration.service.spec.ts | Verifies professional nav style | ✅ |
| PROD-124.5 | `generateArrivalNarration > should generate arrival narration in FRIENDLY style` | narration.service.spec.ts | Verifies arrival narration | ✅ |
| PROD-124.6 | `generateArrivalNarration > should generate arrival narration in HISTORICAL style` | narration.service.spec.ts | Verifies historical arrival | ✅ |
| PROD-124.7 | `generateArrivalNarration > should generate arrival narration in PROFESSIONAL style` | narration.service.spec.ts | Verifies professional arrival | ✅ |

### PROD-125: Preferences / Follow Me Mode

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-125.1 | `getPreferences > should return existing preferences` | preferences.service.spec.ts | Verifies preferences retrieval | ✅ |
| PROD-125.2 | `getPreferences > should create default preferences if none exist` | preferences.service.spec.ts | Verifies default creation | ✅ |
| PROD-125.3 | `updatePreferences > should update existing preferences` | preferences.service.spec.ts | Verifies preferences update | ✅ |
| PROD-125.4 | `updatePreferences > should create preferences if updating non-existent` | preferences.service.spec.ts | Verifies upsert behavior | ✅ |
| PROD-125.5 | `updatePreferences > should update multiple fields at once` | preferences.service.spec.ts | Verifies batch update | ✅ |
| PROD-125.6 | `getVoiceStyle > should return voice style` | preferences.service.spec.ts | Verifies voice style getter | ✅ |
| PROD-125.7 | `getLanguage > should return language` | preferences.service.spec.ts | Verifies language getter | ✅ |
| PROD-125.8 | `getInterests > should return interests array` | preferences.service.spec.ts | Verifies interests getter | ✅ |

### PROD-130: Saved Places

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-130.1 | `savePlace > should save a new place` | saved-places.service.spec.ts | Verifies place saving | ✅ |
| PROD-130.2 | `savePlace > should throw ConflictException if place already saved` | saved-places.service.spec.ts | Verifies duplicate prevention | ✅ |
| PROD-130.3 | `getSavedPlaces > should return user saved places` | saved-places.service.spec.ts | Verifies saved places list | ✅ |
| PROD-130.4 | `getSavedPlaces > should filter by type` | saved-places.service.spec.ts | Verifies type filtering | ✅ |
| PROD-130.5 | `getSavedPlaces > should apply limit and offset` | saved-places.service.spec.ts | Verifies pagination | ✅ |
| PROD-130.6 | `getSavedPlace > should return a saved place by ID` | saved-places.service.spec.ts | Verifies single place retrieval | ✅ |
| PROD-130.7 | `getSavedPlace > should throw NotFoundException if not found` | saved-places.service.spec.ts | Verifies error handling | ✅ |
| PROD-130.8 | `isPlaceSaved > should return true if place is saved` | saved-places.service.spec.ts | Verifies saved check | ✅ |
| PROD-130.9 | `isPlaceSaved > should return false if place is not saved` | saved-places.service.spec.ts | Verifies not saved check | ✅ |
| PROD-130.10 | `updateSavedPlace > should update notes` | saved-places.service.spec.ts | Verifies note update | ✅ |
| PROD-130.11 | `updateSavedPlace > should throw NotFoundException if not found` | saved-places.service.spec.ts | Verifies error handling | ✅ |
| PROD-130.12 | `removeSavedPlace > should remove a saved place` | saved-places.service.spec.ts | Verifies place removal | ✅ |
| PROD-130.13 | `removeSavedPlace > should throw NotFoundException if not found` | saved-places.service.spec.ts | Verifies error handling | ✅ |
| PROD-130.14 | `getSavedPlacesCount > should return count of saved places` | saved-places.service.spec.ts | Verifies count | ✅ |

### PROD-131: Custom Tours

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-131.1 | `createTour > should create a new tour with stops` | tours.service.spec.ts | Verifies tour creation | ✅ |
| PROD-131.2 | `createTour > should throw BadRequestException for empty stops` | tours.service.spec.ts | Verifies validation | ✅ |
| PROD-131.3 | `getUserTours > should return user tours` | tours.service.spec.ts | Verifies tour listing | ✅ |
| PROD-131.4 | `getUserTours > should apply limit and offset` | tours.service.spec.ts | Verifies pagination | ✅ |
| PROD-131.5 | `getPublicTours > should return public tours` | tours.service.spec.ts | Verifies public tour access | ✅ |
| PROD-131.6 | `getTour > should return a tour by ID` | tours.service.spec.ts | Verifies tour retrieval | ✅ |
| PROD-131.7 | `getTour > should throw NotFoundException if tour not found` | tours.service.spec.ts | Verifies error handling | ✅ |
| PROD-131.8 | `getTour > should throw ForbiddenException for private tour accessed by non-owner` | tours.service.spec.ts | Verifies authorization | ✅ |
| PROD-131.9 | `getTour > should allow access to public tours by non-owner` | tours.service.spec.ts | Verifies public access | ✅ |
| PROD-131.10 | `updateTour > should update tour details` | tours.service.spec.ts | Verifies tour update | ✅ |
| PROD-131.11 | `updateTour > should throw ForbiddenException if not owner` | tours.service.spec.ts | Verifies authorization | ✅ |
| PROD-131.12 | `addStop > should add a stop to tour` | tours.service.spec.ts | Verifies stop addition | ✅ |
| PROD-131.13 | `addStop > should throw ForbiddenException if not owner` | tours.service.spec.ts | Verifies authorization | ✅ |
| PROD-131.14 | `removeStop > should remove a stop from tour` | tours.service.spec.ts | Verifies stop removal | ✅ |
| PROD-131.15 | `removeStop > should throw NotFoundException if stop not in tour` | tours.service.spec.ts | Verifies error handling | ✅ |
| PROD-131.16 | `reorderStops > should reorder tour stops` | tours.service.spec.ts | Verifies stop reordering | ✅ |
| PROD-131.17 | `reorderStops > should throw BadRequestException for invalid stop ID` | tours.service.spec.ts | Verifies validation | ✅ |
| PROD-131.18 | `deleteTour > should delete a tour` | tours.service.spec.ts | Verifies tour deletion | ✅ |
| PROD-131.19 | `deleteTour > should throw ForbiddenException if not owner` | tours.service.spec.ts | Verifies authorization | ✅ |

### PROD-132: User Notes

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-132.1 | `createNote > should create a new note` | notes.service.spec.ts | Verifies note creation | ✅ |
| PROD-132.2 | `createNote > should create note with photos` | notes.service.spec.ts | Verifies photo attachment | ✅ |
| PROD-132.3 | `getUserNotes > should return user notes` | notes.service.spec.ts | Verifies note listing | ✅ |
| PROD-132.4 | `getUserNotes > should filter by placeId` | notes.service.spec.ts | Verifies place filtering | ✅ |
| PROD-132.5 | `getUserNotes > should apply limit and offset` | notes.service.spec.ts | Verifies pagination | ✅ |
| PROD-132.6 | `getNotesForPlace > should return notes for a specific place` | notes.service.spec.ts | Verifies place-specific notes | ✅ |
| PROD-132.7 | `getNotesForPlace > should return empty array if no notes for place` | notes.service.spec.ts | Verifies empty result | ✅ |
| PROD-132.8 | `getNote > should return a note by ID` | notes.service.spec.ts | Verifies note retrieval | ✅ |
| PROD-132.9 | `getNote > should throw NotFoundException if note not found` | notes.service.spec.ts | Verifies error handling | ✅ |
| PROD-132.10 | `getNote > should throw ForbiddenException if note owned by different user` | notes.service.spec.ts | Verifies authorization | ✅ |
| PROD-132.11 | `updateNote > should update note text` | notes.service.spec.ts | Verifies text update | ✅ |
| PROD-132.12 | `updateNote > should throw NotFoundException if note not found` | notes.service.spec.ts | Verifies error handling | ✅ |
| PROD-132.13 | `updateNote > should throw ForbiddenException if not owner` | notes.service.spec.ts | Verifies authorization | ✅ |
| PROD-132.14 | `updateNote > should update photos` | notes.service.spec.ts | Verifies photo update | ✅ |
| PROD-132.15 | `addPhotosToNote > should add photos to existing note` | notes.service.spec.ts | Verifies photo addition | ✅ |
| PROD-132.16 | `addPhotosToNote > should throw NotFoundException if note not found` | notes.service.spec.ts | Verifies error handling | ✅ |
| PROD-132.17 | `addPhotosToNote > should throw ForbiddenException if not owner` | notes.service.spec.ts | Verifies authorization | ✅ |
| PROD-132.18 | `addPhotosToNote > should limit photos to maximum of 10` | notes.service.spec.ts | Verifies photo limit | ✅ |
| PROD-132.19 | `removePhotoFromNote > should remove a photo from note` | notes.service.spec.ts | Verifies photo removal | ✅ |
| PROD-132.20 | `removePhotoFromNote > should throw NotFoundException if note not found` | notes.service.spec.ts | Verifies error handling | ✅ |
| PROD-132.21 | `removePhotoFromNote > should throw ForbiddenException if not owner` | notes.service.spec.ts | Verifies authorization | ✅ |
| PROD-132.22 | `deleteNote > should delete a note` | notes.service.spec.ts | Verifies note deletion | ✅ |
| PROD-132.23 | `deleteNote > should throw NotFoundException if note not found` | notes.service.spec.ts | Verifies error handling | ✅ |
| PROD-132.24 | `deleteNote > should throw ForbiddenException if not owner` | notes.service.spec.ts | Verifies authorization | ✅ |
| PROD-132.25 | `getNotesCount > should return count of user notes` | notes.service.spec.ts | Verifies note count | ✅ |
| PROD-132.26 | `getPlaceNotesCount > should return count of notes for a specific place` | notes.service.spec.ts | Verifies place note count | ✅ |

### Test Summary for PROD-120-133 (AI Tour Guide)

| Test Type | Count | Status |
|-----------|-------|--------|
| PoiService Unit Tests | 14 | ✅ |
| NarrationService Unit Tests | 21 | ✅ |
| PreferencesService Unit Tests | 20 | ✅ |
| SavedPlacesService Unit Tests | 16 | ✅ |
| ToursService Unit Tests | 21 | ✅ |
| NotesService Unit Tests | 28 | ✅ |
| AmbientSoundsService Unit Tests | 26 | ✅ |
| OfflineModeService Unit Tests | 21 | ✅ |
| Phase 3 E2E Tests | 58 | ✅ |
| **Total** | **225** | ✅ |

### PROD-128: Ambient Sounds

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-128.1 | `getSounds > should return all sounds` | ambient-sounds.service.spec.ts | Verifies sound library listing | ✅ |
| PROD-128.2 | `getSoundsByCategory > should filter by category` | ambient-sounds.service.spec.ts | Verifies category filtering | ✅ |
| PROD-128.3 | `getSoundsForPoiType > should return sounds for POI type` | ambient-sounds.service.spec.ts | Verifies POI-to-sound mapping | ✅ |
| PROD-128.4 | `getSoundById > should return sound by ID` | ambient-sounds.service.spec.ts | Verifies single sound retrieval | ✅ |
| PROD-128.5 | `getPreferences > should return sound preferences` | ambient-sounds.service.spec.ts | Verifies preference retrieval | ✅ |
| PROD-128.6 | `updatePreferences > should update preferences` | ambient-sounds.service.spec.ts | Verifies preference updates | ✅ |
| PROD-128 | E2E: GET /tour-guide/ambient-sounds | tour-guide-phase3.e2e-spec.ts | End-to-end sound library tests (11 tests) | ✅ |

### PROD-129: Offline Mode

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-129.1 | `createRegion > should create offline region` | offline-mode.service.spec.ts | Verifies region creation | ✅ |
| PROD-129.2 | `createRegion > should reject duplicate name` | offline-mode.service.spec.ts | Verifies name uniqueness | ✅ |
| PROD-129.3 | `getRegions > should return user regions` | offline-mode.service.spec.ts | Verifies region listing | ✅ |
| PROD-129.4 | `getRegion > should return region details` | offline-mode.service.spec.ts | Verifies region retrieval | ✅ |
| PROD-129.5 | `downloadRegionData > should cache POI data` | offline-mode.service.spec.ts | Verifies data download | ✅ |
| PROD-129.6 | `getRegionPois > should return cached POIs` | offline-mode.service.spec.ts | Verifies cached data retrieval | ✅ |
| PROD-129.7 | `preGenerateNarrations > should generate narrations` | offline-mode.service.spec.ts | Verifies narration pre-generation | ✅ |
| PROD-129.8 | `syncRegion > should refresh data` | offline-mode.service.spec.ts | Verifies data sync | ✅ |
| PROD-129.9 | `getStorageUsage > should calculate storage` | offline-mode.service.spec.ts | Verifies storage tracking | ✅ |
| PROD-129.10 | `deleteRegion > should delete region and data` | offline-mode.service.spec.ts | Verifies region deletion | ✅ |
| PROD-129 | E2E: /tour-guide/offline/* | tour-guide-phase3.e2e-spec.ts | End-to-end offline mode tests (23 tests) | ✅ |

### PROD-133: Interest Queries Enhancement

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-133.1 | `recordInterestUsage > should track interest usage` | preferences.service.spec.ts | Verifies interest history tracking | ✅ |
| PROD-133.2 | `getInterestHistory > should return usage history` | preferences.service.spec.ts | Verifies history retrieval | ✅ |
| PROD-133.3 | `getSuggestedInterests > should return suggestions` | preferences.service.spec.ts | Verifies interest suggestions | ✅ |
| PROD-133.4 | `getSuggestedInterests > should include POI-based suggestions` | preferences.service.spec.ts | Verifies context-aware suggestions | ✅ |
| PROD-133.5 | `clearInterestHistory > should clear history` | preferences.service.spec.ts | Verifies history clearing | ✅ |
| PROD-133 | E2E: /tour-guide/preferences/interest-history | tour-guide-phase3.e2e-spec.ts | End-to-end interest history tests (10 tests) | ✅ |

### Features Not Yet Implemented

| Req ID | Title | Status |
|--------|-------|--------|
| PROD-126 | AR Integration | Client-side only (mobile) |

---

## 9. E2E Test Coverage

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
| **Messaging (E2E)** | messaging.e2e-spec.ts | 38 | Full messaging flow, conversations CRUD, messages, archive | ✅ |
| **Messaging (Browser)** | messaging.spec.ts | 29 | UI interactions, real-time, accessibility, mobile responsive | ✅ |
| **Applications (Unit)** | applications.*.spec.ts | 24 | Application CRUD, status transitions, authorization | ✅ |
| **Applications (E2E)** | applications.e2e-spec.ts | 15 | Full rental application flow, owner review, withdrawal | ✅ |
| **Leases (Unit)** | leases.*.spec.ts | 60 | Lease CRUD, payments, rent reminders, cron jobs, e-signature | ✅ |
| **Leases (E2E)** | leases.e2e-spec.ts | 15 | Full lease lifecycle, payments, activation, termination | ✅ |
| **Maintenance (Unit)** | maintenance.*.spec.ts | 49 | Maintenance CRUD, workflow transitions, authorization | ✅ |
| **Maintenance (E2E)** | maintenance.e2e-spec.ts | 18 | Full maintenance workflow, approval, completion | ✅ |
| **Lease Renewal (Unit)** | lease-renewal.service.spec.ts | 20 | Cron jobs, offer CRUD, status transitions, authorization | ✅ |
| **Lease Renewal (E2E)** | lease-renewal.e2e-spec.ts | 15 | Full renewal workflow, accept/decline, new lease generation | ✅ |
| **Dashboard (Unit)** | dashboard.*.spec.ts | 50 | Expense CRUD, dashboard aggregation, net income calculation, tenant dashboard, documents | ✅ |
| **Dashboard (E2E)** | dashboard.e2e-spec.ts | 24 | Full landlord dashboard, expenses CRUD, filtering, authorization | ✅ |
| **Tenant Portal (Unit)** | tenant-*.spec.ts | 21 | Tenant dashboard aggregation, document CRUD, authorization | ✅ |
| **Tenant Portal (E2E)** | tenant-portal.e2e-spec.ts | 26 | Tenant dashboard, e-signature flow, payment link, documents CRUD | ✅ |
| **Tour Guide Phase 3 (E2E)** | tour-guide-phase3.e2e-spec.ts | 58 | Ambient sounds, offline mode, interest history (PROD-128, 129, 133) | ✅ |

---

## 9.2. Stay Planning (PROD-140 to PROD-144)

### PROD-140: Interactive Planning Wizard

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-140.1 | `createSession > should create a new planning session` | session.service.spec.ts | Verifies session creation for stay planning | ✅ |
| PROD-140.2 | `createSession > should create session with property link` | session.service.spec.ts | Verifies session links to property | ✅ |
| PROD-140.3 | `createSession > should throw NotFoundException for invalid property` | session.service.spec.ts | Verifies property validation | ✅ |
| PROD-140.4 | `getSession > should return session by ID` | session.service.spec.ts | Verifies session retrieval | ✅ |
| PROD-140.5 | `getUserSessions > should filter by completed status` | session.service.spec.ts | Verifies session filtering | ✅ |
| PROD-140.6 | `updateWizardStep > should update wizard step with answers` | session.service.spec.ts | Verifies wizard progression | ✅ |
| PROD-140.7 | `updateWizardStep > should throw BadRequestException for completed session` | session.service.spec.ts | Verifies completed session protection | ✅ |
| PROD-140.8 | `updateWizardStep > should validate date range` | session.service.spec.ts | Verifies date validation | ✅ |
| PROD-140.9 | `updateWizardStep > should validate budget range` | session.service.spec.ts | Verifies budget validation | ✅ |
| PROD-140.10 | `generateProposals > should generate AI proposals` | session.service.spec.ts | Verifies AI proposal generation | ✅ |
| PROD-140.11 | `generateProposals > should throw BadRequestException without dates` | session.service.spec.ts | Verifies required fields | ✅ |
| PROD-140.12 | `selectProposal > should select a proposal` | session.service.spec.ts | Verifies proposal selection | ✅ |
| PROD-140.13 | `selectProposal > should throw BadRequestException for invalid proposal index` | session.service.spec.ts | Verifies proposal validation | ✅ |
| PROD-140.14 | `completeSession > should complete a session` | session.service.spec.ts | Verifies session completion | ✅ |
| PROD-140.15 | `deleteSession > should delete a session` | session.service.spec.ts | Verifies session deletion | ✅ |

### PROD-141: Daily Schedules

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-141.1 | `createTripPlan > should create a new trip plan` | trip-plan.service.spec.ts | Verifies trip plan creation | ✅ |
| PROD-141.2 | `createTripPlan > should validate date range` | trip-plan.service.spec.ts | Verifies date validation | ✅ |
| PROD-141.3 | `createTripPlan > should create trip plan with days and activities` | trip-plan.service.spec.ts | Verifies nested creation | ✅ |
| PROD-141.4 | `getTripPlan > should return trip plan by ID` | trip-plan.service.spec.ts | Verifies retrieval | ✅ |
| PROD-141.5 | `getUserTripPlans > should filter by property ID` | trip-plan.service.spec.ts | Verifies property filtering | ✅ |
| PROD-141.6 | `getUserTripPlans > should filter by status` | trip-plan.service.spec.ts | Verifies status filtering | ✅ |
| PROD-141.7 | `updateTripPlan > should update trip plan` | trip-plan.service.spec.ts | Verifies update | ✅ |
| PROD-141.8 | `deleteTripPlan > should delete trip plan` | trip-plan.service.spec.ts | Verifies deletion | ✅ |
| PROD-141.9 | `addDay > should add day to trip plan` | trip-plan.service.spec.ts | Verifies day addition | ✅ |
| PROD-141.10 | `updateDay > should update day` | trip-plan.service.spec.ts | Verifies day update | ✅ |
| PROD-141.11 | `deleteDay > should delete day` | trip-plan.service.spec.ts | Verifies day deletion | ✅ |
| PROD-141.12 | `addActivity > should add activity to day` | trip-plan.service.spec.ts | Verifies activity addition | ✅ |
| PROD-141.13 | `updateActivity > should update activity` | trip-plan.service.spec.ts | Verifies activity update | ✅ |
| PROD-141.14 | `deleteActivity > should delete activity` | trip-plan.service.spec.ts | Verifies activity deletion | ✅ |
| PROD-141.15 | `reorderActivities > should reorder activities` | trip-plan.service.spec.ts | Verifies activity reordering | ✅ |
| PROD-141.16 | `getTripPlanStats > should return trip plan statistics` | trip-plan.service.spec.ts | Verifies statistics calculation | ✅ |

### PROD-142: Touristic Information

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-142.1 | `searchAttractions > should search attractions` | attraction.service.spec.ts | Verifies attraction search | ✅ |
| PROD-142.2 | `searchAttractions > should filter by categories` | attraction.service.spec.ts | Verifies category filtering | ✅ |
| PROD-142.3 | `searchAttractions > should filter by minimum rating` | attraction.service.spec.ts | Verifies rating filtering | ✅ |
| PROD-142.4 | `searchAttractions > should filter by maximum price level` | attraction.service.spec.ts | Verifies price level filtering | ✅ |
| PROD-142.5 | `searchAttractions > should search by query text` | attraction.service.spec.ts | Verifies text search | ✅ |
| PROD-142.6 | `searchAttractions > should calculate distance when coordinates provided` | attraction.service.spec.ts | Verifies distance calculation | ✅ |
| PROD-142.7 | `searchAttractions > should use property coordinates if provided` | attraction.service.spec.ts | Verifies property location | ✅ |
| PROD-142.8 | `getAttraction > should return attraction by ID` | attraction.service.spec.ts | Verifies retrieval | ✅ |
| PROD-142.9 | `getAttractionsByCategory > should return attractions by category` | attraction.service.spec.ts | Verifies category lookup | ✅ |
| PROD-142.10 | `createAttraction > should create attraction` | attraction.service.spec.ts | Verifies creation | ✅ |
| PROD-142.11 | `updateAttraction > should update attraction` | attraction.service.spec.ts | Verifies update | ✅ |
| PROD-142.12 | `syncFromExternalSource > should create new attractions` | attraction.service.spec.ts | Verifies external sync | ✅ |
| PROD-142.13 | `syncFromExternalSource > should update existing attractions` | attraction.service.spec.ts | Verifies sync update | ✅ |

### PROD-143: Attraction Bookings

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-143.1 | `createBooking > should create booking` | attraction.service.spec.ts | Verifies booking creation | ✅ |
| PROD-143.2 | `createBooking > should throw NotFoundException for invalid attraction` | attraction.service.spec.ts | Verifies attraction validation | ✅ |
| PROD-143.3 | N/A - Feature not in schema | N/A | isBookable field not in current schema | N/A |
| PROD-143.4 | `createBooking > should throw BadRequestException for past date` | attraction.service.spec.ts | Verifies date validation | ✅ |
| PROD-143.5 | `getBooking > should return booking by ID` | attraction.service.spec.ts | Verifies retrieval | ✅ |
| PROD-143.6 | `getUserBookings > should return user bookings` | attraction.service.spec.ts | Verifies listing | ✅ |
| PROD-143.7 | `getUserBookings > should filter by status` | attraction.service.spec.ts | Verifies status filtering | ✅ |
| PROD-143.8 | `updateBooking > should update booking` | attraction.service.spec.ts | Verifies update | ✅ |
| PROD-143.9 | `updateBooking > should throw BadRequestException for non-pending booking` | attraction.service.spec.ts | Verifies status protection | ✅ |
| PROD-143.10 | `cancelBooking > should cancel booking` | attraction.service.spec.ts | Verifies cancellation | ✅ |
| PROD-143.11 | `cancelBooking > should throw BadRequestException for completed booking` | attraction.service.spec.ts | Verifies completed protection | ✅ |
| PROD-143.12 | `confirmBooking > should confirm booking` | attraction.service.spec.ts | Verifies confirmation | ✅ |
| PROD-143.13 | `getAvailableTimeSlots > should return time slots` | attraction.service.spec.ts | Verifies availability | ✅ |
| PROD-143.14 | `getAvailableTimeSlots > should return more slots on weekends` | attraction.service.spec.ts | Verifies weekend slots | ✅ |

### PROD-144: Catering for Events

| Req ID | Test Case | Test File | Purpose | Status |
|--------|-----------|-----------|---------|--------|
| PROD-144.1 | `searchProviders > should search providers` | catering.service.spec.ts | Verifies provider search | ✅ |
| PROD-144.2 | `searchProviders > should filter by city` | catering.service.spec.ts | Verifies city filtering | ✅ |
| PROD-144.3 | `searchProviders > should filter by cuisine types` | catering.service.spec.ts | Verifies cuisine filtering | ✅ |
| PROD-144.4 | `searchProviders > should filter by minimum rating` | catering.service.spec.ts | Verifies rating filtering | ✅ |
| PROD-144.5 | `searchProviders > should paginate results` | catering.service.spec.ts | Verifies pagination works correctly | ✅ |
| PROD-144.6 | `getProvider > should return provider by ID` | catering.service.spec.ts | Verifies retrieval | ✅ |
| PROD-144.7 | `createProvider > should create provider` | catering.service.spec.ts | Verifies creation | ✅ |
| PROD-144.8 | `updateProvider > should update provider` | catering.service.spec.ts | Verifies update | ✅ |
| PROD-144.9 | `createMenu > should create menu` | catering.service.spec.ts | Verifies menu creation | ✅ |
| PROD-144.10 | `getProviderMenus > should return provider menus` | catering.service.spec.ts | Verifies menu listing | ✅ |
| PROD-144.11 | `updateMenu > should update menu` | catering.service.spec.ts | Verifies menu update | ✅ |
| PROD-144.12 | `deleteMenu > should soft delete menu` | catering.service.spec.ts | Verifies menu deletion | ✅ |
| PROD-144.13 | `requestQuote > should request a quote` | catering.service.spec.ts | Verifies quote request | ✅ |
| PROD-144.14 | `requestQuote > should throw BadRequestException for inactive provider` | catering.service.spec.ts | Verifies provider status | ✅ |
| PROD-144.15 | `requestQuote > should throw BadRequestException for insufficient lead time` | catering.service.spec.ts | Verifies lead time | ✅ |
| PROD-144.16 | `requestQuote > should throw BadRequestException for too few guests` | catering.service.spec.ts | Verifies minimum guests | ✅ |
| PROD-144.17 | `requestQuote > should throw BadRequestException for too many guests` | catering.service.spec.ts | Verifies maximum guests | ✅ |
| PROD-144.18 | `getQuote > should return quote by ID` | catering.service.spec.ts | Verifies quote retrieval | ✅ |
| PROD-144.19 | `getUserQuotes > should return user quotes` | catering.service.spec.ts | Verifies quote listing | ✅ |
| PROD-144.20 | `getUserQuotes > should filter by status` | catering.service.spec.ts | Verifies status filtering | ✅ |
| PROD-144.21 | `getProviderQuotes > should return provider quotes` | catering.service.spec.ts | Verifies provider view | ✅ |
| PROD-144.22 | `respondToQuote > should respond to quote` | catering.service.spec.ts | Verifies provider response | ✅ |
| PROD-144.23 | `respondToQuote > should throw BadRequestException for already responded quote` | catering.service.spec.ts | Verifies response protection | ✅ |
| PROD-144.24 | `acceptQuote > should accept quote` | catering.service.spec.ts | Verifies quote acceptance | ✅ |
| PROD-144.25 | `acceptQuote > should throw BadRequestException for expired quote` | catering.service.spec.ts | Verifies expiration | ✅ |
| PROD-144.26 | `rejectQuote > should reject quote` | catering.service.spec.ts | Verifies quote rejection | ✅ |
| PROD-144.27 | `cancelQuote > should cancel requested quote` | catering.service.spec.ts | Verifies quote cancellation | ✅ |

### Test Summary for PROD-140-144

| Test Type | Count | Status |
|-----------|-------|--------|
| SessionService Unit Tests | 22 | ✅ |
| TripPlanService Unit Tests | 24 | ✅ |
| AttractionService Unit Tests | 32 | ✅ |
| CateringService Unit Tests | 37 | ✅ |
| **Total** | **115** | ✅ |

**Note:** Tests were fixed on 2025-12-30 to align with Prisma schema field names. Test now pass 100%.

---

## 10. Test Execution Summary

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
| 2025-12-31 | ✅ 1964 passed | ✅ 529 passed | ✅ 5 passed | ✅ Passing | CI fixes: Prisma migration for virtual staging, revenue-share spec fixes, ESLint globals |
| 2025-12-30 | ✅ 1157 passed | ✅ 279 passed | ✅ 5 passed | ✅ Passing | Implemented PROD-083 Mortgage Calculator (27 unit tests) |
| 2025-12-30 | ✅ 1130 passed | ✅ 279 passed | ✅ 5 passed | ⏳ Pending | Implemented PROD-030-031 Virtual Staging & Time-of-Day Photos (44 unit tests) |
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

## 11. Requirements Without Tests

The following requirements do not yet have test coverage:

| Req ID | Title | Reason |
|--------|-------|--------|
| ~~PROD-008~~ | ~~ID Verification~~ | ✅ **COMPLETE** - VerificationRequest model, VerificationModule (service, controller, DTOs), 3 document types (PASSPORT, DRIVERS_LICENSE, NATIONAL_ID), admin queue, approval/rejection workflow, email notifications; 27 unit tests (21 service + 6 controller) |
| ~~PROD-009~~ | ~~Background Checks~~ | ✅ **COMPLETE** - BackgroundCheck model, 3 check types (BASIC, STANDARD, COMPREHENSIVE), consent flow, webhook processing; integrated into VerificationModule |
| ~~PROD-010~~ | ~~Verified Badges~~ | ✅ **COMPLETE** - hasVerifiedBadge logic, getVerifiedUsers filter, badge status in user verification response |
| PROD-011 | Biometric Authentication | Client-side implementation (P2) |
| ~~PROD-029~~ | ~~AI Description Generation~~ | ✅ **COMPLETE** - AiDescriptionService with 5 tone styles (LUXURY, FAMILY_FRIENDLY, INVESTMENT_FOCUSED, MODERN_PROFESSIONAL, COZY_WELCOMING), rule-based text generation with property context, 3 endpoints (generate, save, apply); 23 unit tests |
| ~~PROD-030~~ | ~~Virtual Staging~~ | ✅ **COMPLETE** - VirtualStagingService with room type (13 options) and style (12 options) parameters, mock AI provider integration, staging status tracking, before/after comparison, endpoints (POST /ai/staging, GET requests, DELETE staged, compare); 19 unit tests |
| ~~PROD-031~~ | ~~Time-of-Day Photos~~ | ✅ **COMPLETE** - TimeOfDayPhotosService with time-of-day (6 options) and season (4 options) tagging, photo groups for same-angle linking, slider data API, filter by time/season, bulk tagging; 25 unit tests |
| ~~PROD-044~~ | ~~Voice Search~~ | ✅ **COMPLETE** - VoiceSearchService with rule-based NLP parsing (cities, countries, prices, bedrooms, bathrooms, listing types, features, square meters, year built), confidence scoring, display text generation, PropertyQueryDto conversion; 2 endpoints (POST /voice-search/parse, POST /voice-search/to-query); 62 unit tests; 12 E2E tests |
| ~~PROD-045~~ | ~~Visual Search~~ | ✅ **COMPLETE** - VisualSearchService with perceptual hashing (pHash), color histogram extraction, brightness calculation, weighted similarity scoring (60% structural, 25% color, 15% composition); Sharp for image processing; ImageHash Prisma model; 4 endpoints (POST /visual-search, POST /visual-search/index/:propertyId, POST /visual-search/index-batch, GET /visual-search/stats); 32 unit tests; 9 E2E tests |
| PROD-046-047 | Advanced Search Features (AR, Lifestyle) | Future features |
| ~~PROD-083~~ | ~~Mortgage Calculator~~ | ✅ **COMPLETE** - MortgageCalculatorService with principal+interest formula, amortization schedule (monthly/yearly breakdown), affordability calculation (DTI-based), scenario comparison, property-specific embedded calculator, 7 endpoints (calculate, amortization, affordability, compare, property calculate, property amortization, default scenarios); 27 unit tests |
| ~~PROD-050~~ | ~~AI Recommendations~~ | ✅ **COMPLETE** - BrowsingHistoryService (view tracking, history retrieval), RecommendationsService (preference extraction from favorites/search agents, similarity calculation, scoring algorithm with 40% preference + 40% similarity + 20% popularity weights, explanation generation), RecommendationFeedback model, 4 endpoints (GET /recommendations, GET /recommendations/preferences, GET /recommendations/similar/:propertyId, POST /recommendations/:propertyId/feedback); 30 browsing history tests; 31 recommendation tests |
| ~~PROD-060-068~~ | ~~Service Providers~~ | ✅ **COMPLETE** - Prisma models, ServiceProvidersModule (controller, service, DTOs), availability calendar, job matching, admin approval, rating system; 51 unit tests (33 service + 18 controller); 47 E2E tests covering full API flow |
| ~~PROD-096-097~~ | ~~Advanced Transaction Features~~ | ✅ **COMPLETE** - Split Payments (PROD-096): SplitPaymentService with participant management, payment links, email notifications, reminders, cancellation; 27 test cases. Escrow Services (PROD-097): EscrowService with milestone-based releases, threshold-based escrow, funding, dispute resolution; 47 test cases. PaymentsController with 20+ endpoints for both features. |
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
| ~~PROD-120-133~~ | ~~AI Tour Guide~~ | ✅ **COMPLETE** - TourGuideModule with 6 services (PoiService for Google Places API, NarrationService with 3 voice styles, PreferencesService, SavedPlacesService, ToursService with custom routes, NotesService with photos); Prisma models (TourPreferences, SavedPlace, CustomTour, TourStop, UserNote); 20+ API endpoints; 106 unit tests |
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
| 2025-12-30 | Claude | Implemented AI Tour Guide (PROD-120-133): Prisma models (VoiceStyle/InterestCategory/PoiType enums, TourPreferences, SavedPlace, CustomTour, TourStop, UserNote), TourGuideModule with 6 services (PoiService for Google Places API integration with mock fallback, NarrationService with 3 voice styles and interest-based content, PreferencesService for user settings, SavedPlacesService for bookmarks, ToursService for custom routes with stops/reordering, NotesService for POI notes with photos), 20+ API endpoints at /tour-guide/*; 106 unit tests (14 poi + 21 narration + 10 preferences + 16 saved-places + 21 tours + 28 notes); Total tests now 1526 |
| 2025-12-30 | Claude | Implemented Split Payments & Escrow Services (PROD-096-097): SplitPaymentService with participant payment links, email notifications, reminders, and cancellation (27 tests); EscrowService with milestone-based releases, threshold-based escrow, funding workflow, and dispute resolution (47 tests); PaymentsController updated with 20+ endpoints for both features; Fixed payments.controller.spec.ts with SplitPaymentService and EscrowService mocks; Total tests now 1639 |
| 2025-12-30 | Claude | Implemented Stay Planning (PROD-140-144): Prisma models (StayPlanningSession, TripPlan, TripDay, TripActivity, Attraction, AttractionBooking, CateringProvider, CateringMenu, CateringQuote with 9 enums), StayPlanningModule with 4 services (SessionService for wizard/proposals, TripPlanService for daily schedules/activities, AttractionService for attractions/bookings, CateringService for providers/quotes), 50+ API endpoints, distance calculation, AI proposal generation; 110 unit tests (18 session + 30 trip-plan + 35 attraction + 27 catering); Total tests now 1824 |
| 2025-12-30 | Claude | Fixed Stay Planning tests (PROD-140-144): Aligned services with Prisma schema field names (title→name, sessionId→planningSessionId, etc.), fixed DTO enums to match Prisma (InterestCategory, TripPlanStatus, CateringQuoteStatus), updated test mocks with correct field names and future dates; All 115 stay-planning tests now pass; Updated matrix entries (removed isBookable filter, replaced with price level filter; replaced catering distance with pagination test); Total tests now 1829 |
| 2025-12-31 | Claude | CI fixes: Added Prisma migration for virtual staging columns (isVirtuallyStaged, roomType, stagingStyle, timeOfDay, season, photoGroupId on PropertyMedia; VirtualStagingRequest table; RoomType/StagingStyle/TimeOfDay/Season/StagingStatus enums); Fixed revenue-share spec mock chain (3 findUnique calls needed); Added fetch/URLSearchParams to ESLint globals; Fixed AI maintenance appointment suggestions fallback; All 1964 unit tests + 529 E2E tests passing |
| 2025-12-31 | Claude | Implemented Biometric Authentication (PROD-011.1-011.5): Prisma models (BiometricDeviceType enum, BiometricCredential for device storage, BiometricChallenge for time-limited challenges), BiometricService with challenge-response authentication (RSA-SHA256 signature verification), device enrollment/management, biometric settings, sensitive action verification; BiometricRequiredGuard for payment/profile/password actions; 7 controller endpoints at /auth/biometric/*; 34 unit tests; Total tests now 2029 |
| 2025-12-31 | Claude | Enhanced Search Agent Notifications (PROD-041.7-041.29): NotificationFrequency enum (INSTANT, DAILY_DIGEST, WEEKLY_DIGEST), SearchAgentMatch model for digest accumulation, SearchAgentDigestService with @Cron jobs (daily 9 AM, weekly Monday 9 AM, cleanup 2 AM), unsubscribeToken generation, one-click unsubscribe endpoint at GET /search-agents/unsubscribe, search-digest.hbs email template; 23 new unit tests (12 search-agents + 11 digest); Total tests TBD |
| 2026-01-01 | Claude | Fixed Voice Search bugs (PROD-044.31-044.32): Country extraction now uses word boundary regex matching to prevent false positives (e.g., "USA" incorrectly detected); City extraction filters out country names and stop words to prevent capturing "Usa Under" or "Spain With" as city names; Added cityExcludeWords list with price keywords and country names |

---

*This document is auto-referenced by CLAUDE.md and must be updated with each test change.*
