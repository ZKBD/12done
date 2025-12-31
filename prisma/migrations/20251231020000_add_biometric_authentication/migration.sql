-- CreateEnum (PROD-011)
CREATE TYPE "BiometricDeviceType" AS ENUM ('IOS', 'ANDROID');

-- AlterTable User - Add biometricEnabled (PROD-011.3)
ALTER TABLE "User" ADD COLUMN "biometricEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable BiometricCredential (PROD-011.1, PROD-011.2)
CREATE TABLE "BiometricCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" "BiometricDeviceType" NOT NULL,
    "publicKey" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "BiometricCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable BiometricChallenge (PROD-011.1)
CREATE TABLE "BiometricChallenge" (
    "id" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex BiometricCredential
CREATE UNIQUE INDEX "BiometricCredential_credentialId_key" ON "BiometricCredential"("credentialId");
CREATE UNIQUE INDEX "BiometricCredential_userId_deviceId_key" ON "BiometricCredential"("userId", "deviceId");
CREATE INDEX "BiometricCredential_userId_idx" ON "BiometricCredential"("userId");
CREATE INDEX "BiometricCredential_credentialId_idx" ON "BiometricCredential"("credentialId");

-- CreateIndex BiometricChallenge
CREATE UNIQUE INDEX "BiometricChallenge_challenge_key" ON "BiometricChallenge"("challenge");
CREATE INDEX "BiometricChallenge_challenge_idx" ON "BiometricChallenge"("challenge");
CREATE INDEX "BiometricChallenge_deviceId_idx" ON "BiometricChallenge"("deviceId");
CREATE INDEX "BiometricChallenge_expiresAt_idx" ON "BiometricChallenge"("expiresAt");

-- AddForeignKey BiometricCredential -> User
ALTER TABLE "BiometricCredential" ADD CONSTRAINT "BiometricCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
