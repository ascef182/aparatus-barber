"use server";

import { headers } from "next/headers";
import { staffActionClient, ActionError } from "@/lib/safe-action";
import { createTaxAwareSubscriptionCheckout, getStripe, SaaSPlans } from "@/lib/stripe";
import { getTenantUrl } from "@/lib/tenant-host";
import { getClientIp, hashIpAddress } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/services/audit-service";
import {
  countOtherOrganizationsForVisitor,
  recordDeviceFingerprint,
} from "@/lib/services/fingerprint-service";
import { z } from "zod";

export const createSubscriptionCheckout = staffActionClient({ billing: ["manage"] })
  .inputSchema(
    z.object({
      plan: z.enum(["STARTER", "GROWTH", "PRO"]),
      // Device fingerprint (FingerprintJS open source, best-effort) — só
      // sinaliza reuso de dispositivo entre organizations, nunca bloqueia o
      // checkout (ver CHECKOUT_DEVICE_REUSE_DETECTED abaixo).
      visitorId: z.string().max(64).optional(),
    }),
  )
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
    if (!process.env.NEXT_PUBLIC_APP_URL) throw new ActionError("NEXT_PUBLIC_APP_URL não configurada.");

    if (parsedInput.visitorId) {
      const visitorId = parsedInput.visitorId;
      const requestHeaders = await headers();
      await recordDeviceFingerprint({
        organizationId: ctx.organization.id,
        visitorId,
        context: "SUBSCRIPTION_CHECKOUT",
        ipHash: hashIpAddress(await getClientIp()),
        userAgent: requestHeaders.get("user-agent") ?? undefined,
      });
      // Só sinaliza (não bloqueia) — dispositivos compartilhados (NAT,
      // coworking) ou donos com várias filiais geram falso positivo legítimo.
      const otherOrgs = await countOtherOrganizationsForVisitor(visitorId, ctx.organization.id);
      if (otherOrgs >= 2) {
        await logAuditEvent({
          organizationId: ctx.organization.id,
          entity: "Organization",
          entityId: ctx.organization.id,
          action: "CHECKOUT_DEVICE_REUSE_DETECTED",
          metadata: { visitorId, otherOrganizationsCount: otherOrgs },
        });
      }
    }

    // Sem trial_period_days aqui: quem chega nesta ação já usou (ou já
    // perdeu) o período de teste grátis de 7 dias sem cartão
    // (isFreeTrialExpired em organization-service.ts) -- dar mais dias de
    // trial do Stripe por cima disso furaria o bloqueio que o dashboard já
    // aplicou.
    // Bug corrigido (mesmo de create-booking-payment-checkout.ts): o
    // retorno ia pro domínio raiz — /dashboard/billing só existe sob o
    // subdomínio do tenant, então o dono nunca via a confirmação.
    const session = await createTaxAwareSubscriptionCheckout({
      customer, line_items: [{ price: plan.priceId, quantity: 1 }],
      subscription_data: { metadata: { organizationId: ctx.organization.id, plan: parsedInput.plan } },
      metadata: {
        organizationId: ctx.organization.id,
        plan: parsedInput.plan,
        kind: "saas",
        ...(parsedInput.visitorId ? { visitorId: parsedInput.visitorId } : {}),
      },
      success_url: getTenantUrl(ctx.organization.slug, "/dashboard/billing?success=1"),
      cancel_url: getTenantUrl(ctx.organization.slug, "/dashboard/billing?canceled=1"),
    });
    // Retorna só o campo usado pelo cliente — objeto do SDK do Stripe não é
    // plain object, gerava aviso de serialização no console.
    return { url: session.url };
  });
