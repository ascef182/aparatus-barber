-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('CUSTOMER', 'STAFF');

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMPTZ,
    "lastStaffReadAt" TIMESTAMPTZ,
    "lastCustomerReadAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "MessageSenderType" NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customerCoupon" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customerCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_organizationId_lastMessageAt_idx" ON "conversation"("organizationId", "lastMessageAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_organizationId_customerId_key" ON "conversation"("organizationId", "customerId");

-- CreateIndex
CREATE INDEX "message_organizationId_conversationId_createdAt_idx" ON "message"("organizationId", "conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "customerCoupon_organizationId_idx" ON "customerCoupon"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "customerCoupon_customerId_couponId_key" ON "customerCoupon"("customerId", "couponId");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customerCoupon" ADD CONSTRAINT "customerCoupon_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customerCoupon" ADD CONSTRAINT "customerCoupon_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customerCoupon" ADD CONSTRAINT "customerCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
