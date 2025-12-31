-- NFR-014: MFA Authentication with TOTP
-- This migration adds Multi-Factor Authentication support

-- Add mfaEnabled field to User table
ALTER TABLE "User" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;

-- MFA Secret table - stores encrypted TOTP secret
CREATE TABLE "MfaSecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "enabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfaSecret_pkey" PRIMARY KEY ("id")
);

-- MFA Backup Code table - stores hashed backup codes
CREATE TABLE "MfaBackupCode" (
    "id" TEXT NOT NULL,
    "mfaSecretId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaBackupCode_pkey" PRIMARY KEY ("id")
);

-- MFA Pending Session table - temporary sessions for MFA login
CREATE TABLE "MfaPendingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaPendingSession_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on MfaSecret.userId (one secret per user)
CREATE UNIQUE INDEX "MfaSecret_userId_key" ON "MfaSecret"("userId");

-- Unique constraint on MfaPendingSession.token
CREATE UNIQUE INDEX "MfaPendingSession_token_key" ON "MfaPendingSession"("token");

-- Indexes for efficient queries
CREATE INDEX "MfaSecret_userId_idx" ON "MfaSecret"("userId");
CREATE INDEX "MfaBackupCode_mfaSecretId_idx" ON "MfaBackupCode"("mfaSecretId");
CREATE INDEX "MfaPendingSession_token_idx" ON "MfaPendingSession"("token");
CREATE INDEX "MfaPendingSession_userId_idx" ON "MfaPendingSession"("userId");

-- Foreign key constraints
ALTER TABLE "MfaSecret" ADD CONSTRAINT "MfaSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaBackupCode" ADD CONSTRAINT "MfaBackupCode_mfaSecretId_fkey" FOREIGN KEY ("mfaSecretId") REFERENCES "MfaSecret"("id") ON DELETE CASCADE ON UPDATE CASCADE;
