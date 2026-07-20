"use server";

import { staffWriteActionClient, ActionError } from "@/lib/safe-action";
import { getStripe } from "@/lib/stripe";
import { setStripeConnectAccountId } from "@/lib/services/organization-service";

export const createConnectOnboarding = staffWriteActionClient({ billing: ["manage"] }).action(
  async ({ ctx }) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new ActionError("NEXT_PUBLIC_APP_URL não configurada.");
    const stripe = getStripe();
    let accountId = ctx.organization.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({ type: "express", country: "DE", capabilities: { card_payments: { requested: true }, transfers: { requested: true } }, metadata: { organizationId: ctx.organization.id } });
      accountId = account.id;
      await setStripeConnectAccountId(ctx.organization.id, accountId);
    }
    return stripe.accountLinks.create({ account: accountId, type: "account_onboarding", refresh_url: `${appUrl}/dashboard/billing?connect=refresh`, return_url: `${appUrl}/dashboard/billing?connect=complete` });
  },
);
