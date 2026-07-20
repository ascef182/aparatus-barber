-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEB', 'CHATBOT', 'DASHBOARD', 'RECURRING');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('ON_SITE', 'DEPOSIT', 'FULL_PREPAYMENT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NONE', 'PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('VACATION', 'SICK', 'BLOCK', 'OTHER');

-- CreateEnum
CREATE TYPE "ClosedPeriodSource" AS ENUM ('MANUAL', 'HOLIDAY_IMPORT');

-- CreateEnum
CREATE TYPE "SettingsScope" AS ENUM ('ORGANIZATION', 'LOCATION', 'STAFF');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED');

-- DropForeignKey
ALTER TABLE "BarbershopService" DROP CONSTRAINT "BarbershopService_barbershopId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_barbershopId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- DropTable
DROP TABLE "Barbershop";

-- DropTable
DROP TABLE "BarbershopService";

-- DropTable
DROP TABLE "Booking";

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "memberId" TEXT,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "imageUrl" TEXT,
    "color" TEXT,
    "allowOverbooking" BOOLEAN NOT NULL DEFAULT false,
    "commissionBps" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staffWorkingHours" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "validFrom" TIMESTAMPTZ,
    "validUntil" TIMESTAMPTZ,

    CONSTRAINT "staffWorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staffAbsence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL DEFAULT 'BLOCK',
    "startAt" TIMESTAMPTZ NOT NULL,
    "endAt" TIMESTAMPTZ NOT NULL,
    "note" TEXT,

    CONSTRAINT "staffAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closedPeriod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMPTZ NOT NULL,
    "endAt" TIMESTAMPTZ NOT NULL,
    "source" "ClosedPeriodSource" NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "closedPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "priceInCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "depositInCents" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staffService" (
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "staffService_pkey" PRIMARY KEY ("staffId","serviceId")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "locale" TEXT,
    "notes" TEXT,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "gdprErasedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "validFrom" TIMESTAMPTZ,
    "validUntil" TIMESTAMPTZ,
    "maxRedemptions" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "startAt" TIMESTAMPTZ NOT NULL,
    "endAt" TIMESTAMPTZ NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "source" "BookingSource" NOT NULL DEFAULT 'WEB',
    "priceInCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "discountInCents" INTEGER NOT NULL DEFAULT 0,
    "couponId" TEXT,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'ON_SITE',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NONE',
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "cancellationFeeInCents" INTEGER,
    "cancelledAt" TIMESTAMPTZ,
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "expiresAt" TIMESTAMPTZ,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenantSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scope" "SettingsScope" NOT NULL DEFAULT 'ORGANIZATION',
    "scopeId" TEXT,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "tenantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_memberId_key" ON "staff"("memberId");

-- CreateIndex
CREATE INDEX "staff_organizationId_locationId_idx" ON "staff"("organizationId", "locationId");

-- CreateIndex
CREATE INDEX "staffWorkingHours_staffId_weekday_idx" ON "staffWorkingHours"("staffId", "weekday");

-- CreateIndex
CREATE INDEX "staffWorkingHours_organizationId_idx" ON "staffWorkingHours"("organizationId");

-- CreateIndex
CREATE INDEX "staffAbsence_staffId_startAt_idx" ON "staffAbsence"("staffId", "startAt");

-- CreateIndex
CREATE INDEX "staffAbsence_organizationId_startAt_idx" ON "staffAbsence"("organizationId", "startAt");

-- CreateIndex
CREATE INDEX "closedPeriod_organizationId_startAt_idx" ON "closedPeriod"("organizationId", "startAt");

-- CreateIndex
CREATE INDEX "service_organizationId_isActive_idx" ON "service"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "staffService_organizationId_idx" ON "staffService"("organizationId");

-- CreateIndex
CREATE INDEX "staffService_serviceId_idx" ON "staffService"("serviceId");

-- CreateIndex
CREATE INDEX "customer_organizationId_email_idx" ON "customer"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_organizationId_userId_key" ON "customer"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "coupon_organizationId_isActive_idx" ON "coupon"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_organizationId_code_key" ON "coupon"("organizationId", "code");

-- CreateIndex
CREATE INDEX "booking_organizationId_startAt_idx" ON "booking"("organizationId", "startAt");

-- CreateIndex
CREATE INDEX "booking_staffId_startAt_idx" ON "booking"("staffId", "startAt");

-- CreateIndex
CREATE INDEX "booking_customerId_startAt_idx" ON "booking"("customerId", "startAt");

-- CreateIndex
CREATE INDEX "booking_organizationId_status_idx" ON "booking"("organizationId", "status");

-- CreateIndex
CREATE INDEX "tenantSettings_organizationId_scope_scopeId_createdAt_idx" ON "tenantSettings"("organizationId", "scope", "scopeId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffWorkingHours" ADD CONSTRAINT "staffWorkingHours_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffAbsence" ADD CONSTRAINT "staffAbsence_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffService" ADD CONSTRAINT "staffService_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffService" ADD CONSTRAINT "staffService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Anti-double-booking: dois bookings ativos do mesmo staff não podem se
-- sobrepor no tempo. Garantia no banco contra race conditions (plano §6.3).
-- Staff com allowOverbooking será modelado como "cadeiras" (pós-MVP).
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "staffId" WITH =,
    tstzrange("startAt", "endAt") WITH &&
  )
  WHERE ("status" IN ('PENDING_PAYMENT', 'PENDING', 'CONFIRMED'));
