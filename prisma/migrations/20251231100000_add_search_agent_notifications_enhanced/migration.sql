-- PROD-041: Enhanced Search Agent Notifications
-- Adds notification frequency settings, digest accumulation, and one-click unsubscribe

-- CreateEnum
CREATE TYPE "NotificationFrequency" AS ENUM ('INSTANT', 'DAILY_DIGEST', 'WEEKLY_DIGEST');

-- AlterTable
ALTER TABLE "SearchAgent" ADD COLUMN "notificationFrequency" "NotificationFrequency" NOT NULL DEFAULT 'INSTANT';
ALTER TABLE "SearchAgent" ADD COLUMN "unsubscribeToken" TEXT;

-- CreateTable
CREATE TABLE "SearchAgentMatch" (
    "id" TEXT NOT NULL,
    "searchAgentId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "SearchAgentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchAgent_notificationFrequency_idx" ON "SearchAgent"("notificationFrequency");

-- CreateIndex
CREATE UNIQUE INDEX "SearchAgent_unsubscribeToken_key" ON "SearchAgent"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "SearchAgentMatch_searchAgentId_idx" ON "SearchAgentMatch"("searchAgentId");

-- CreateIndex
CREATE INDEX "SearchAgentMatch_notifiedAt_idx" ON "SearchAgentMatch"("notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SearchAgentMatch_searchAgentId_propertyId_key" ON "SearchAgentMatch"("searchAgentId", "propertyId");

-- AddForeignKey
ALTER TABLE "SearchAgentMatch" ADD CONSTRAINT "SearchAgentMatch_searchAgentId_fkey" FOREIGN KEY ("searchAgentId") REFERENCES "SearchAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchAgentMatch" ADD CONSTRAINT "SearchAgentMatch_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
