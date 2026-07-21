"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Mostra o toast de retorno do Stripe Checkout Connect (?booking=success|canceled,
 * ver create-booking-payment-checkout.ts) — sem isso, o cliente volta pro
 * site e nada indica se o pagamento passou ou não.
 */
export function BookingStatusToast({
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
