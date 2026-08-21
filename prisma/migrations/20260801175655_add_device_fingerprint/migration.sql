-- CreateTable
CREATE TABLE "deviceFingerprint" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "visitorId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deviceFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deviceFingerprint_visitorId_idx" ON "deviceFingerprint"("visitorId");

-- CreateIndex
CREATE INDEX "deviceFingerprint_organizationId_idx" ON "deviceFingerprint"("organizationId");
