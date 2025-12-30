-- CreateEnum
CREATE TYPE "TenantDocumentType" AS ENUM ('LEASE_AGREEMENT', 'SIGNED_LEASE', 'PAYMENT_RECEIPT', 'MOVE_IN_CHECKLIST', 'MOVE_OUT_CHECKLIST', 'NOTICE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LEASE_SIGNED_BY_LANDLORD';
ALTER TYPE "NotificationType" ADD VALUE 'LEASE_SIGNED_BY_TENANT';
ALTER TYPE "NotificationType" ADD VALUE 'LEASE_FULLY_EXECUTED';
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_UPLOADED';

-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "landlordSignatureIp" TEXT,
ADD COLUMN     "landlordSignedAt" TIMESTAMP(3),
ADD COLUMN     "tenantSignatureIp" TEXT,
ADD COLUMN     "tenantSignedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TenantDocument" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "type" "TenantDocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "documentUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantDocument_leaseId_idx" ON "TenantDocument"("leaseId");

-- CreateIndex
CREATE INDEX "TenantDocument_type_idx" ON "TenantDocument"("type");

-- CreateIndex
CREATE INDEX "TenantDocument_uploadedById_idx" ON "TenantDocument"("uploadedById");

-- AddForeignKey
ALTER TABLE "TenantDocument" ADD CONSTRAINT "TenantDocument_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
