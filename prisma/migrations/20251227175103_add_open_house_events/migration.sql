-- CreateTable
CREATE TABLE "OpenHouseEvent" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "maxAttendees" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenHouseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpenHouseEvent_propertyId_idx" ON "OpenHouseEvent"("propertyId");

-- CreateIndex
CREATE INDEX "OpenHouseEvent_date_idx" ON "OpenHouseEvent"("date");

-- AddForeignKey
ALTER TABLE "OpenHouseEvent" ADD CONSTRAINT "OpenHouseEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
