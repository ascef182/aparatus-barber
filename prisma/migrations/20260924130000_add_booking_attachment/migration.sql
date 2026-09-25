-- AlterTable
ALTER TABLE "booking" ADD CONSTRAINT "booking_id_organizationId_key" UNIQUE ("id", "organizationId");

-- CreateTable
CREATE TABLE "bookingAttachment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookingAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookingAttachment_bookingId_idx" ON "bookingAttachment"("bookingId");

-- AddForeignKey
ALTER TABLE "bookingAttachment" ADD CONSTRAINT "bookingAttachment_bookingId_organizationId_fkey" FOREIGN KEY ("bookingId", "organizationId") REFERENCES "booking"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
