-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_STATUS_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_WITHDRAWN';

-- CreateTable
CREATE TABLE "RentalApplication" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "employmentStatus" TEXT,
    "employer" TEXT,
    "jobTitle" TEXT,
    "monthlyIncome" DECIMAL(12,2),
    "incomeCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "employmentDuration" TEXT,
    "references" JSONB,
    "desiredMoveInDate" TIMESTAMP(3),
    "desiredLeaseTerm" INTEGER,
    "numberOfOccupants" INTEGER,
    "hasPets" BOOLEAN NOT NULL DEFAULT false,
    "petDetails" TEXT,
    "additionalNotes" TEXT,
    "documents" JSONB,
    "ownerNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalApplication_applicantId_idx" ON "RentalApplication"("applicantId");

-- CreateIndex
CREATE INDEX "RentalApplication_propertyId_idx" ON "RentalApplication"("propertyId");

-- CreateIndex
CREATE INDEX "RentalApplication_status_idx" ON "RentalApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RentalApplication_applicantId_propertyId_key" ON "RentalApplication"("applicantId", "propertyId");

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
