"use server";
import { staffActionClient, ActionError } from "@/lib/safe-action";
import { getStripe } from "@/lib/stripe";
import { getTenantUrl } from "@/lib/tenant-host";

export const createBillingPortal = staffActionClient({ billing: ["manage"] }).action(async ({ ctx }) => {
  if (!ctx.organization.stripeCustomerId) throw new ActionError("Nenhuma assinatura encontrada.");
  if (!process.env.NEXT_PUBLIC_APP_URL) throw new ActionError("NEXT_PUBLIC_APP_URL não configurada.");
  // Mesmo bug de create-booking-payment-checkout.ts: /dashboard/billing só
  // existe sob o subdomínio do tenant, não no domínio raiz.
  const session = await getStripe().billingPortal.sessions.create({
    customer: ctx.organization.stripeCustomerId,
    return_url: getTenantUrl(ctx.organization.slug, "/dashboard/billing"),
  });
  // Retorna só o campo usado pelo cliente — o objeto do SDK do Stripe não é
  // plain object (React/Next recusa passar isso de Server pra Client
  // Component), gerava aviso de serialização no console a cada chamada.
  return { url: session.url };
});
