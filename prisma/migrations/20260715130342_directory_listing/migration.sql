-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "isListed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "listedAt" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "location_city_idx" ON "location"("city");
