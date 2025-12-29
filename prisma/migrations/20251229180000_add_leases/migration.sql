-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "RentPaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'RENT_REMINDER_TENANT';
ALTER TYPE "NotificationType" ADD VALUE 'RENT_PAYMENT_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'RENT_OVERDUE_TENANT';
ALTER TYPE "NotificationType" ADD VALUE 'RENT_OVERDUE_LANDLORD';

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "dueDay" INTEGER NOT NULL,
    "securityDeposit" DECIMAL(12,2),
    "securityDepositPaid" BOOLEAN NOT NULL DEFAULT false,
    "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentPayment" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "RentPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(12,2),
    "paymentMethod" TEXT,
    "transactionRef" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "overdueSentAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lease_propertyId_idx" ON "Lease"("propertyId");

-- CreateIndex
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "Lease_landlordId_idx" ON "Lease"("landlordId");

-- CreateIndex
CREATE INDEX "Lease_status_idx" ON "Lease"("status");

-- CreateIndex
CREATE INDEX "RentPayment_leaseId_idx" ON "RentPayment"("leaseId");

-- CreateIndex
CREATE INDEX "RentPayment_dueDate_idx" ON "RentPayment"("dueDate");

-- CreateIndex
CREATE INDEX "RentPayment_status_idx" ON "RentPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RentPayment_leaseId_dueDate_key" ON "RentPayment"("leaseId", "dueDate");

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
