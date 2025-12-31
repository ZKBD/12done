-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('LIVING_ROOM', 'BEDROOM', 'KITCHEN', 'BATHROOM', 'DINING_ROOM', 'OFFICE', 'BALCONY', 'GARAGE', 'HALLWAY', 'BASEMENT', 'ATTIC', 'OUTDOOR', 'OTHER');

-- CreateEnum
CREATE TYPE "StagingStyle" AS ENUM ('MODERN', 'TRADITIONAL', 'MINIMALIST', 'SCANDINAVIAN', 'INDUSTRIAL', 'BOHEMIAN', 'COASTAL', 'FARMHOUSE', 'MID_CENTURY', 'CONTEMPORARY', 'RUSTIC', 'LUXURY');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('DAWN', 'MORNING', 'NOON', 'AFTERNOON', 'DUSK', 'NIGHT');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'FALL', 'WINTER');

-- CreateEnum
CREATE TYPE "StagingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable PropertyMedia - Add Virtual Staging columns (PROD-030)
ALTER TABLE "PropertyMedia" ADD COLUMN "isVirtuallyStaged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PropertyMedia" ADD COLUMN "roomType" "RoomType";
ALTER TABLE "PropertyMedia" ADD COLUMN "stagingStyle" "StagingStyle";
ALTER TABLE "PropertyMedia" ADD COLUMN "originalMediaId" TEXT;

-- AlterTable PropertyMedia - Add Time-of-Day columns (PROD-031)
ALTER TABLE "PropertyMedia" ADD COLUMN "timeOfDay" "TimeOfDay";
ALTER TABLE "PropertyMedia" ADD COLUMN "season" "Season";
ALTER TABLE "PropertyMedia" ADD COLUMN "photoGroupId" TEXT;

-- CreateIndex
CREATE INDEX "PropertyMedia_isVirtuallyStaged_idx" ON "PropertyMedia"("isVirtuallyStaged");

-- CreateIndex
CREATE INDEX "PropertyMedia_photoGroupId_idx" ON "PropertyMedia"("photoGroupId");

-- CreateTable VirtualStagingRequest (PROD-030)
CREATE TABLE "VirtualStagingRequest" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "originalMediaId" TEXT NOT NULL,
    "roomType" "RoomType" NOT NULL,
    "stagingStyle" "StagingStyle" NOT NULL,
    "status" "StagingStatus" NOT NULL DEFAULT 'PENDING',
    "stagedMediaId" TEXT,
    "error" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "VirtualStagingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VirtualStagingRequest_propertyId_idx" ON "VirtualStagingRequest"("propertyId");

-- CreateIndex
CREATE INDEX "VirtualStagingRequest_status_idx" ON "VirtualStagingRequest"("status");

-- AddForeignKey
ALTER TABLE "VirtualStagingRequest" ADD CONSTRAINT "VirtualStagingRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualStagingRequest" ADD CONSTRAINT "VirtualStagingRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
