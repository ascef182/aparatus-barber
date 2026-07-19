import type { Coupon } from "@/generated/prisma/client";

export type CouponCheck =
  | { valid: true; discountInCents: number }
  | { valid: false; reason: "inactive" | "expired" | "not_started" | "exhausted" };

/** Valida um cupom e calcula o desconto sobre o preço (snapshot em cents). */
export function checkCoupon(
  coupon: Coupon,
  priceInCents: number,
  redemptionCount: number,
  now: Date,
): CouponCheck {
  if (!coupon.isActive) return { valid: false, reason: "inactive" };
  if (coupon.validFrom && now < coupon.validFrom) {
    return { valid: false, reason: "not_started" };
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return { valid: false, reason: "expired" };
  }
  if (
    coupon.maxRedemptions !== null &&
    redemptionCount >= coupon.maxRedemptions
  ) {
    return { valid: false, reason: "exhausted" };
  }
  const discount =
    coupon.type === "PERCENT"
      ? Math.round((priceInCents * Math.min(coupon.value, 100)) / 100)
      : Math.min(coupon.value, priceInCents);
  return { valid: true, discountInCents: discount };
}
