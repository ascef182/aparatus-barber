import { db } from "@/lib/db";
import { requireTenantId } from "@/lib/tenant-context";
import {
  getCouponByCode,
  countRedemptions,
} from "@/lib/services/coupon-service";

export async function claimCoupon(customerId: string, code: string) {
  const organizationId = requireTenantId();
  const coupon = await getCouponByCode(code);

  if (!coupon || !coupon.isActive) {
    return {
      success: false as const,
      error: "invalid",
      message: "Cupom inválido.",
    };
  }

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) {
    return {
      success: false as const,
      error: "not_yet_valid",
      message: "Cupom ainda não é válido.",
    };
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    return {
      success: false as const,
      error: "expired",
      message: "Cupom expirado.",
    };
  }

  if (coupon.maxRedemptions) {
    const used = await countRedemptions(coupon.id);
    if (used >= coupon.maxRedemptions) {
      return {
        success: false as const,
        error: "exhausted",
        message: "Cupom esgotado.",
      };
    }
  }

  try {
    const claim = await db.customerCoupon.create({
      data: {
        organizationId,
        customerId,
        couponId: coupon.id,
      },
    });
    return {
      success: true as const,
      couponId: claim.couponId,
      claimedAt: claim.claimedAt,
    };
  } catch (error) {
    // P2002 = unique constraint violation (customer already claimed this coupon)
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint failed")
    ) {
      return {
        success: false as const,
        error: "already_claimed",
        message: "Você já resgatou este cupom.",
      };
    }
    throw error;
  }
}

export async function listClaimedCouponsForCustomer(customerId: string) {
  const organizationId = requireTenantId();
  return db.customerCoupon.findMany({
    where: { organizationId, customerId },
    include: {
      coupon: true,
    },
    orderBy: { claimedAt: "desc" },
  });
}
