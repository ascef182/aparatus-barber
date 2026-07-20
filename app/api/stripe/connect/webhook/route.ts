import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { recordStripeEventOnce } from "@/lib/services/stripe-event-service";
import { setConnectAccountCapabilities } from "@/lib/services/organization-service";
import {
  applyRefundToBooking,
  cancelPendingBookingByCheckoutSession,
  confirmBookingFromCheckoutSession,
} from "@/lib/services/booking-service";
import { enqueueBookingNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!signature || !secret) return new NextResponse("Invalid webhook", { status: 400 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return new NextResponse("Invalid signature", { status: 400 }); }
  const isNewEvent = await recordStripeEventOnce({ id: event.id, type: event.type, accountId: event.account });
  if (!isNewEvent) return NextResponse.json({ received: true });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      const booking = await confirmBookingFromCheckoutSession({
        bookingId,
        sessionId: session.id,
        paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      });
      if (booking) {
        await enqueueBookingNotification({ bookingId, type: "confirmation" });
        await enqueueBookingNotification({ bookingId, type: "reminder" }, Math.max(0, booking.startAt.getTime() - Date.now() - 86400000));
      }
    }
  } else if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const booking = await cancelPendingBookingByCheckoutSession(session.id);
    if (booking) {
      await enqueueBookingNotification({ bookingId: booking.id, type: "expired" });
    }
  } else if (event.type === "payment_intent.payment_failed") {
    // Sem payment_intent_data.metadata na criação do checkout, não há como
    // mapear o PaymentIntent a um booking aqui de forma confiável — o caso
    // prático (delayed payment method falhando) já é coberto por
    // checkout.session.async_payment_failed acima. Registrado para
    // auditoria via StripeEvent; sem mutação adicional.
  } else if (event.type === "charge.refund.updated") {
    const refund = event.data.object as Stripe.Refund;
    const paymentIntentId = typeof refund.payment_intent === "string" ? refund.payment_intent : null;
    if (paymentIntentId) {
      await applyRefundToBooking(paymentIntentId, refund.amount);
    }
  } else if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await setConnectAccountCapabilities(account.id, {
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
    });
  }
  return NextResponse.json({ received: true });
}
