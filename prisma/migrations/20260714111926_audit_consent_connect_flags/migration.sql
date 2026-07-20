-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "stripeEvent" ALTER COLUMN "processedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "auditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditLog_organizationId_createdAt_idx" ON "auditLog"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "auditLog_entity_entityId_idx" ON "auditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "consentLog_userId_type_idx" ON "consentLog"("userId", "type");
