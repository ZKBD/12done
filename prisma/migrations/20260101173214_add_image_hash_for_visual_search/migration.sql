-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'INSPECTION_CANCELLED';

-- CreateTable
CREATE TABLE "ImageHash" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "pHash" TEXT NOT NULL,
    "dominantColors" TEXT[],
    "aspectRatio" DOUBLE PRECISION NOT NULL,
    "brightness" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageHash_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageHash_mediaId_key" ON "ImageHash"("mediaId");

-- CreateIndex
CREATE INDEX "ImageHash_pHash_idx" ON "ImageHash"("pHash");

-- AddForeignKey
ALTER TABLE "ImageHash" ADD CONSTRAINT "ImageHash_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "PropertyMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
