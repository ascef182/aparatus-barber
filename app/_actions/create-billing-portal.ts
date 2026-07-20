"use server";
import { staffActionClient, ActionError } from "@/lib/safe-action";
import { getStripe } from "@/lib/stripe";

export const createBillingPortal = staffActionClient({ billing: ["manage"] }).action(async ({ ctx }) => {
  if (!ctx.organization.stripeCustomerId) throw new ActionError("Nenhuma assinatura encontrada.");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new ActionError("NEXT_PUBLIC_APP_URL não configurada.");
  return getStripe().billingPortal.sessions.create({ customer: ctx.organization.stripeCustomerId, return_url: `${appUrl}/dashboard/billing` });
});
