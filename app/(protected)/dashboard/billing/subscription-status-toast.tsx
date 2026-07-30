"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Mesma ideia de app/t/[slug]/booking-status-toast.tsx, mas pro retorno do
 * Stripe Checkout de assinatura SaaS (?success=1|canceled=1, ver
 * create-subscription-checkout.ts).
 */
export function SubscriptionStatusToast({
  status,
  successMessage,
  canceledMessage,
}: {
  status: "success" | "canceled" | null;
  successMessage: string;
  canceledMessage: string;
}) {
  useEffect(() => {
    if (status === "success") toast.success(successMessage);
    if (status === "canceled") toast.info(canceledMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só deve disparar uma vez, no mount, pro valor lido da URL no primeiro paint
  }, []);

  return null;
}
