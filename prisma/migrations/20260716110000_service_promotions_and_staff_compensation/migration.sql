CREATE TYPE "CouponScope" AS ENUM ('ALL_SERVICES', 'SELECTED_SERVICES');
CREATE TYPE "CompensationType" AS ENUM ('MONTHLY', 'HOURLY', 'PER_SERVICE_COMMISSION');

ALTER TABLE "staff"
  ADD COLUMN "jobTitle" TEXT,
  ADD COLUMN "invitationId" TEXT UNIQUE,
  ADD COLUMN "compensationType" "CompensationType",
  ADD COLUMN "compensationAmountInCents" INTEGER;

ALTER TABLE "coupon"
  ADD COLUMN "scope" "CouponScope" NOT NULL DEFAULT 'ALL_SERVICES';

CREATE TABLE "serviceImage" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "serviceImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "couponService" (
  "organizationId" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  CONSTRAINT "couponService_pkey" PRIMARY KEY ("couponId", "serviceId")
);

CREATE INDEX "serviceImage_organizationId_serviceId_idx" ON "serviceImage"("organizationId", "serviceId");
CREATE INDEX "couponService_organizationId_idx" ON "couponService"("organizationId");
CREATE INDEX "couponService_serviceId_idx" ON "couponService"("serviceId");

ALTER TABLE "serviceImage" ADD CONSTRAINT "serviceImage_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "couponService" ADD CONSTRAINT "couponService_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "couponService" ADD CONSTRAINT "couponService_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
