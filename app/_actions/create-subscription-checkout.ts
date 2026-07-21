"use server";

import { staffActionClient, ActionError } from "@/lib/safe-action";
import { createTaxAwareSubscriptionCheckout, getStripe, SaaSPlans } from "@/lib/stripe";
import { z } from "zod";

export const createSubscriptionCheckout = staffActionClient({ billing: ["manage"] })
  .inputSchema(z.object({ plan: z.enum(["STARTER", "GROWTH", "PRO"]) }))
  .action(async ({ parsedInput, ctx }) => {
    const plan = SaaSPlans[parsedInput.plan];
    if (!plan.priceId) throw new ActionError("Plano SaaS não configurado.");
    const stripe = getStripe();
    let customer = ctx.organization.stripeCustomerId;
    if (!customer) {
      const created = await stripe.customers.create({ name: ctx.organization.name, metadata: { organizationId: ctx.organization.id } });
      customer = created.id;
      const { prisma } = await import("@/lib/prisma");
      await prisma.organization.update({ where: { id: ctx.organization.id }, data: { stripeCustomerId: customer } });
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new ActionError("NEXT_PUBLIC_APP_URL não configurada.");
    // Sem trial_period_days aqui: quem chega nesta ação já usou (ou já
    // perdeu) o período de teste grátis de 7 dias sem cartão
    // (isFreeTrialExpired em organization-service.ts) -- dar mais dias de
    // trial do Stripe por cima disso furaria o bloqueio que o dashboard já
    // aplicou.
    return createTaxAwareSubscriptionCheckout({
      customer, line_items: [{ price: plan.priceId, quantity: 1 }],
      subscription_data: { metadata: { organizationId: ctx.organization.id, plan: parsedInput.plan } },
      metadata: { organizationId: ctx.organization.id, plan: parsedInput.plan, kind: "saas" },
      success_url: `${appUrl}/dashboard/billing?success=1`, cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
    });
  });
