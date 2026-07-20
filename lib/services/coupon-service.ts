import { db } from "@/lib/db";
import { requireTenantId } from "@/lib/tenant-context";
import type { CouponType } from "@/generated/prisma/client";

export function listCoupons() {
  return db.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export function getCouponByCode(code: string) {
  return db.coupon.findUnique({
    where: {
      organizationId_code: {
        organizationId: requireTenantId(),
        code: code.trim().toUpperCase(),
      },
    },
  });
}

/** Usos válidos: bookings não cancelados que aplicaram o cupom. */
export function countRedemptions(couponId: string) {
  return db.booking.count({
    where: { couponId, status: { not: "CANCELLED" } },
  });
}

export function createCoupon(data: {
  code: string;
  type: CouponType;
  value: number;
  validFrom?: Date;
  validUntil?: Date;
  maxRedemptions?: number;
}) {
  return db.coupon.create({
    data: {
      ...data,
      code: data.code.trim().toUpperCase(),
      organizationId: requireTenantId(),
    },
  });
}

export function updateCoupon(
  id: string,
  data: Partial<{
    code: string;
    type: CouponType;
    value: number;
    validFrom: Date | null;
    validUntil: Date | null;
    maxRedemptions: number | null;
    isActive: boolean;
  }>,
) {
  return db.coupon.update({
    where: { id },
    data: { ...data, code: data.code?.trim().toUpperCase() },
  });
}

export function deleteCoupon(id: string) {
  return db.coupon.delete({ where: { id } });
}
