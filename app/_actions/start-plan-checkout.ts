"use server";

import { z } from "zod";
import { actionClient, ActionError } from "@/lib/safe-action";
import { createTaxAwareSubscriptionCheckout, SaaSPlans } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Inicia o checkout de assinatura ANTES de existir conta ou organização —
 * a landing page/pricing chama isto direto, sem sessão. Stripe coleta o
 * e-mail no próprio Checkout; a claim (criação de conta + Organization)
 * acontece em /onboarding?session_id=... depois do pagamento (ver
 * app/_actions/create-organization.ts).
 */
export const startPlanCheckout = actionClient
  .inputSchema(z.object({ plan: z.enum(["STARTER", "GROWTH", "PRO"]) }))
  .action(async ({ parsedInput }) => {
    const ip = await getClientIp();
    const { allowed } = await checkRateLimit(`start-plan-checkout:${ip}`, { windowSeconds: 60, max: 10 });
    if (!allowed) throw new ActionError("Muitas tentativas. Aguarde um minuto e tente novamente.");

    const plan = SaaSPlans[parsedInput.plan];
    if (!plan.priceId) throw new ActionError("Plano não configurado.");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new ActionError("NEXT_PUBLIC_APP_URL não configurada.");

    const session = await createTaxAwareSubscriptionCheckout({
      line_items: [{ price: plan.priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 14, metadata: { plan: parsedInput.plan } },
      metadata: { plan: parsedInput.plan, kind: "saas-presignup" },
      success_url: `${appUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
    });
    return { url: session.url };
  });
