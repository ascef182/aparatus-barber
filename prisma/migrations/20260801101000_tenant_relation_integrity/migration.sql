-- Abort before changing constraints if historical data already contains a
-- cross-tenant relation. Repair must be explicit; silently rewriting tenant
-- ownership would make the audit trail unreliable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "staff" c JOIN "location" p ON p.id = c."locationId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "service" c JOIN "location" p ON p.id = c."locationId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "closedPeriod" c JOIN "location" p ON p.id = c."locationId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "staffWorkingHours" c JOIN "staff" p ON p.id = c."staffId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "staffAbsence" c JOIN "staff" p ON p.id = c."staffId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "serviceImage" c JOIN "service" p ON p.id = c."serviceId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "staffService" c JOIN "staff" p ON p.id = c."staffId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "staffService" c JOIN "service" p ON p.id = c."serviceId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "couponService" c JOIN "coupon" p ON p.id = c."couponId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "couponService" c JOIN "service" p ON p.id = c."serviceId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "booking" c JOIN "staff" p ON p.id = c."staffId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "booking" c JOIN "location" p ON p.id = c."locationId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "booking" c JOIN "service" p ON p.id = c."serviceId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "booking" c JOIN "customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "conversation" c JOIN "customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "quoteRequest" c JOIN "location" p ON p.id = c."locationId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "message" c JOIN "conversation" p ON p.id = c."conversationId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "customerCoupon" c JOIN "customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId")
    OR EXISTS (SELECT 1 FROM "customerCoupon" c JOIN "coupon" p ON p.id = c."couponId" WHERE c."organizationId" <> p."organizationId")
  THEN
    RAISE EXCEPTION 'Cross-tenant relationship detected; migration aborted';
  END IF;
END $$;

ALTER TABLE "location" ADD CONSTRAINT "location_id_organizationId_key" UNIQUE ("id", "organizationId");
ALTER TABLE "staff" ADD CONSTRAINT "staff_id_organizationId_key" UNIQUE ("id", "organizationId");
ALTER TABLE "service" ADD CONSTRAINT "service_id_organizationId_key" UNIQUE ("id", "organizationId");
ALTER TABLE "customer" ADD CONSTRAINT "customer_id_organizationId_key" UNIQUE ("id", "organizationId");
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_id_organizationId_key" UNIQUE ("id", "organizationId");
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_id_organizationId_key" UNIQUE ("id", "organizationId");

ALTER TABLE "staff" DROP CONSTRAINT "staff_locationId_fkey";
ALTER TABLE "staffWorkingHours" DROP CONSTRAINT "staffWorkingHours_staffId_fkey";
ALTER TABLE "staffAbsence" DROP CONSTRAINT "staffAbsence_staffId_fkey";
ALTER TABLE "serviceImage" DROP CONSTRAINT "serviceImage_serviceId_fkey";
ALTER TABLE "staffService" DROP CONSTRAINT "staffService_staffId_fkey";
ALTER TABLE "staffService" DROP CONSTRAINT "staffService_serviceId_fkey";
ALTER TABLE "couponService" DROP CONSTRAINT "couponService_couponId_fkey";
ALTER TABLE "couponService" DROP CONSTRAINT "couponService_serviceId_fkey";
ALTER TABLE "booking" DROP CONSTRAINT "booking_staffId_fkey";
ALTER TABLE "booking" DROP CONSTRAINT "booking_serviceId_fkey";
ALTER TABLE "booking" DROP CONSTRAINT "booking_customerId_fkey";
ALTER TABLE "quoteRequest" DROP CONSTRAINT "quoteRequest_locationId_fkey";
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_customerId_fkey";
ALTER TABLE "message" DROP CONSTRAINT "message_conversationId_fkey";
ALTER TABLE "customerCoupon" DROP CONSTRAINT "customerCoupon_customerId_fkey";
ALTER TABLE "customerCoupon" DROP CONSTRAINT "customerCoupon_couponId_fkey";

ALTER TABLE "staff" ADD CONSTRAINT "staff_locationId_organizationId_fkey" FOREIGN KEY ("locationId", "organizationId") REFERENCES "location"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staffWorkingHours" ADD CONSTRAINT "staffWorkingHours_staffId_organizationId_fkey" FOREIGN KEY ("staffId", "organizationId") REFERENCES "staff"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staffAbsence" ADD CONSTRAINT "staffAbsence_staffId_organizationId_fkey" FOREIGN KEY ("staffId", "organizationId") REFERENCES "staff"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "serviceImage" ADD CONSTRAINT "serviceImage_serviceId_organizationId_fkey" FOREIGN KEY ("serviceId", "organizationId") REFERENCES "service"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staffService" ADD CONSTRAINT "staffService_staffId_organizationId_fkey" FOREIGN KEY ("staffId", "organizationId") REFERENCES "staff"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staffService" ADD CONSTRAINT "staffService_serviceId_organizationId_fkey" FOREIGN KEY ("serviceId", "organizationId") REFERENCES "service"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "couponService" ADD CONSTRAINT "couponService_couponId_organizationId_fkey" FOREIGN KEY ("couponId", "organizationId") REFERENCES "coupon"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "couponService" ADD CONSTRAINT "couponService_serviceId_organizationId_fkey" FOREIGN KEY ("serviceId", "organizationId") REFERENCES "service"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking" ADD CONSTRAINT "booking_locationId_organizationId_fkey" FOREIGN KEY ("locationId", "organizationId") REFERENCES "location"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking" ADD CONSTRAINT "booking_staffId_organizationId_fkey" FOREIGN KEY ("staffId", "organizationId") REFERENCES "staff"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking" ADD CONSTRAINT "booking_serviceId_organizationId_fkey" FOREIGN KEY ("serviceId", "organizationId") REFERENCES "service"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking" ADD CONSTRAINT "booking_customerId_organizationId_fkey" FOREIGN KEY ("customerId", "organizationId") REFERENCES "customer"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quoteRequest" ADD CONSTRAINT "quoteRequest_locationId_organizationId_fkey" FOREIGN KEY ("locationId", "organizationId") REFERENCES "location"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_customerId_organizationId_fkey" FOREIGN KEY ("customerId", "organizationId") REFERENCES "customer"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_organizationId_fkey" FOREIGN KEY ("conversationId", "organizationId") REFERENCES "conversation"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customerCoupon" ADD CONSTRAINT "customerCoupon_customerId_organizationId_fkey" FOREIGN KEY ("customerId", "organizationId") REFERENCES "customer"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customerCoupon" ADD CONSTRAINT "customerCoupon_couponId_organizationId_fkey" FOREIGN KEY ("couponId", "organizationId") REFERENCES "coupon"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service" ADD CONSTRAINT "service_locationId_organizationId_fkey" FOREIGN KEY ("locationId", "organizationId") REFERENCES "location"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "closedPeriod" ADD CONSTRAINT "closedPeriod_locationId_organizationId_fkey" FOREIGN KEY ("locationId", "organizationId") REFERENCES "location"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
