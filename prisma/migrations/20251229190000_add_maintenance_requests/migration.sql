-- CreateEnum
CREATE TYPE "MaintenanceRequestType" AS ENUM ('PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'STRUCTURAL', 'PEST_CONTROL', 'CLEANING', 'LANDSCAPING', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceRequestStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'NORMAL', 'URGENT', 'EMERGENCY');

-- AlterEnum: Add maintenance notification types
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_REQUEST_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_REQUEST_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_REQUEST_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_REQUEST_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_REQUEST_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_REQUEST_CONFIRMED';

-- CreateTable
CREATE TABLE "MaintenanceRequest" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "assignedProviderId" TEXT,
    "type" "MaintenanceRequestType" NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MaintenanceRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rejectionReason" TEXT,
    "preferredDate" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "scheduledTimeSlot" TEXT,
    "completionNotes" TEXT,
    "completionPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "completedAt" TIMESTAMP(3),
    "confirmedByTenant" BOOLEAN NOT NULL DEFAULT false,
    "confirmedByLandlord" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceRequest_propertyId_idx" ON "MaintenanceRequest"("propertyId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_leaseId_idx" ON "MaintenanceRequest"("leaseId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_tenantId_idx" ON "MaintenanceRequest"("tenantId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_landlordId_idx" ON "MaintenanceRequest"("landlordId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_status_idx" ON "MaintenanceRequest"("status");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_assignedProviderId_idx" ON "MaintenanceRequest"("assignedProviderId");

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assignedProviderId_fkey" FOREIGN KEY ("assignedProviderId") REFERENCES "ServiceProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
