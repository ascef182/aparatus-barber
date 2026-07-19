import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { recordStripeEventOnce } from "@/lib/services/stripe-event-service";
import { getOrganizationByStripeSubscriptionId, updateSubscriptionFromStripe } from "@/lib/services/organization-service";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new NextResponse("Invalid webhook", { status: 400 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return new NextResponse("Invalid signature", { status: 400 }); }
  const isNewEvent = await recordStripeEventOnce({ id: event.id, type: event.type });
  if (!isNewEvent) return NextResponse.json({ received: true });

  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    const subscription = event.data.object as Stripe.Subscription;
    // O funil pré-cadastro (start-plan-checkout.ts) cria a subscription
    // ANTES de existir Organization, então sem organizationId no metadata
    // no momento da criação — create-organization.ts faz backfill do
    // metadata ao reivindicar, mas este fallback por stripeSubscriptionId
    // garante que eventos (cancelamento, past_due) nunca fiquem órfãos
    // mesmo se o backfill falhar ou o evento chegar antes dele.
    const orgId = subscription.metadata.organizationId
      ?? (await getOrganizationByStripeSubscriptionId(subscription.id))?.id;
    if (orgId) {
      const status = subscription.status === "active" ? "ACTIVE" : subscription.status === "trialing" ? "TRIALING" : subscription.status === "past_due" ? "PAST_DUE" : "CANCELED";
      await updateSubscriptionFromStripe(orgId, {
        plan: subscription.metadata.plan as "STARTER" | "GROWTH" | "PRO",
        stripeSubscriptionId: subscription.id,
        status,
        currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end * 1000),
        gracePeriodEndsAt: status === "PAST_DUE" ? new Date(Date.now() + 7 * 86400000) : null,
      });
    }
  }
  return NextResponse.json({ received: true });
}
