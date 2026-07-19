import type { SubscriptionPlan } from "@/generated/prisma/client";

export const PLAN_LIMITS: Record<SubscriptionPlan, { locations: number | null; staff: number | null; priceInCents: number }> = {
  STARTER: { locations: 1, staff: 5, priceInCents: 3900 },
  GROWTH: { locations: 3, staff: 20, priceInCents: 7900 },
  PRO: { locations: null, staff: null, priceInCents: 14900 },
};

export function isPlanLimitReached(plan: SubscriptionPlan | null, count: number, resource: "locations" | "staff") {
  const limit = PLAN_LIMITS[plan ?? "STARTER"][resource]; return limit !== null && count >= limit;
}
