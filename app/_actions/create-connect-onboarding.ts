"use server";

import { staffWriteActionClient, ActionError } from "@/lib/safe-action";
import { getStripe } from "@/lib/stripe";
import { setStripeConnectAccountId } from "@/lib/services/organization-service";
import { getTenantUrl } from "@/lib/tenant-host";

export const createConnectOnboarding = staffWriteActionClient({ billing: ["manage"] }).action(
  async ({ ctx }) => {
    if (!process.env.NEXT_PUBLIC_APP_URL) throw new ActionError("NEXT_PUBLIC_APP_URL não configurada.");
    const stripe = getStripe();
    let accountId = ctx.organization.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({ type: "express", country: "DE", capabilities: { card_payments: { requested: true }, transfers: { requested: true } }, metadata: { organizationId: ctx.organization.id } });
      accountId = account.id;
      await setStripeConnectAccountId(ctx.organization.id, accountId);
    }
    // Mesmo bug de create-booking-payment-checkout.ts: /dashboard/billing só
    // existe sob o subdomínio do tenant, não no domínio raiz.
    return stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: getTenantUrl(ctx.organization.slug, "/dashboard/billing?connect=refresh"),
      return_url: getTenantUrl(ctx.organization.slug, "/dashboard/billing?connect=complete"),
    });
  },
);
