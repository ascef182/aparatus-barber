-- CreateTable
CREATE TABLE "tenantImpressum" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'DE',
    "representedBy" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "registerCourt" TEXT,
    "registerNumber" TEXT,
    "vatId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "tenantImpressum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenantImpressum_organizationId_key" ON "tenantImpressum"("organizationId");
