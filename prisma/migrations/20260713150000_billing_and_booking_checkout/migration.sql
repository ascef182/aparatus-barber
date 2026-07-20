CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'GROWTH', 'PRO');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

ALTER TABLE "service"
  ADD COLUMN "paymentMode" "PaymentMode",
  ADD COLUMN "depositPercent" INTEGER;

ALTER TABLE "booking"
  ADD COLUMN "stripeCheckoutSessionId" TEXT;
CREATE UNIQUE INDEX "booking_stripeCheckoutSessionId_key"
  ON "booking"("stripeCheckoutSessionId");

ALTER TABLE "organization"
  ADD COLUMN "subscriptionPlan" "SubscriptionPlan",
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "subscriptionCurrentPeriodEnd" TIMESTAMPTZ,
  ADD COLUMN "trialEndsAt" TIMESTAMPTZ,
  ADD COLUMN "gracePeriodEndsAt" TIMESTAMPTZ;
CREATE UNIQUE INDEX "organization_stripeSubscriptionId_key"
  ON "organization"("stripeSubscriptionId");

CREATE TABLE "stripeEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "accountId" TEXT,
  "processedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stripeEvent_pkey" PRIMARY KEY ("id")
);
