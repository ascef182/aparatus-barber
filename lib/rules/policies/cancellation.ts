import type { ResolvedRules } from "@/lib/rules/schemas";

export type CancellationCheck =
  | { allowed: true; feeInCents: number }
  | { allowed: false; reason: "already_started" };

/**
 * Política de cancelamento: livre até N horas antes; depois disso aplica
 * taxa (percentual sobre o preço ou fixa). Bookings já iniciados não
 * podem ser cancelados pelo cliente (staff pode marcar no-show).
 */
export function checkCancellation(
  booking: { startAt: Date; priceInCents: number; discountInCents: number },
  rules: ResolvedRules,
  now: Date,
): CancellationCheck {
  if (now >= booking.startAt) return { allowed: false, reason: "already_started" };

  const freeUntil = new Date(
    booking.startAt.getTime() -
      rules.cancellation.freeUntilHoursBefore * 3_600_000,
  );
  if (now <= freeUntil) return { allowed: true, feeInCents: 0 };

  const payable = Math.max(booking.priceInCents - booking.discountInCents, 0);
  const feeInCents =
    rules.cancellation.feeType === "PERCENT"
      ? Math.round((payable * Math.min(rules.cancellation.feeValue, 100)) / 100)
      : Math.min(rules.cancellation.feeValue, payable);
  return { allowed: true, feeInCents };
}
