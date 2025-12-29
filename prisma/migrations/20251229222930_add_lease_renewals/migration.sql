-- CreateEnum
CREATE TYPE "LeaseRenewalStatus" AS ENUM ('PENDING', 'OFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LEASE_RENEWAL_REMINDER_LANDLORD';
ALTER TYPE "NotificationType" ADD VALUE 'LEASE_RENEWAL_OFFER_TENANT';
ALTER TYPE "NotificationType" ADD VALUE 'LEASE_RENEWAL_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'LEASE_RENEWAL_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'LEASE_RENEWAL_EXPIRED';

-- CreateTable
CREATE TABLE "LeaseRenewal" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "newLeaseId" TEXT,
    "status" "LeaseRenewalStatus" NOT NULL DEFAULT 'PENDING',
    "proposedStartDate" TIMESTAMP(3),
    "proposedEndDate" TIMESTAMP(3),
    "proposedRentAmount" DECIMAL(12,2),
    "proposedTerms" TEXT,
    "offerExpiresAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "offerSentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseRenewal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaseRenewal_newLeaseId_key" ON "LeaseRenewal"("newLeaseId");

-- CreateIndex
CREATE INDEX "LeaseRenewal_leaseId_idx" ON "LeaseRenewal"("leaseId");

-- CreateIndex
CREATE INDEX "LeaseRenewal_landlordId_idx" ON "LeaseRenewal"("landlordId");

-- CreateIndex
CREATE INDEX "LeaseRenewal_tenantId_idx" ON "LeaseRenewal"("tenantId");

-- CreateIndex
CREATE INDEX "LeaseRenewal_status_idx" ON "LeaseRenewal"("status");

-- AddForeignKey
ALTER TABLE "LeaseRenewal" ADD CONSTRAINT "LeaseRenewal_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseRenewal" ADD CONSTRAINT "LeaseRenewal_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseRenewal" ADD CONSTRAINT "LeaseRenewal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseRenewal" ADD CONSTRAINT "LeaseRenewal_newLeaseId_fkey" FOREIGN KEY ("newLeaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
