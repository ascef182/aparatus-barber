CREATE TYPE "StripeEventStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');

ALTER TABLE "stripeEvent"
  ADD COLUMN "status" "StripeEventStatus" NOT NULL DEFAULT 'PROCESSED',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastError" TEXT,
  ALTER COLUMN "processedAt" DROP NOT NULL,
  ALTER COLUMN "processedAt" DROP DEFAULT;

ALTER TABLE "stripeEvent" ALTER COLUMN "status" SET DEFAULT 'PROCESSING';

CREATE INDEX "stripeEvent_status_startedAt_idx"
  ON "stripeEvent"("status", "startedAt");

ALTER TYPE "NotificationStatus" RENAME VALUE 'SENT' TO 'ACCEPTED';
