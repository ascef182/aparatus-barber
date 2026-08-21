"use server";

import Stripe from "stripe";
import { staffWriteActionClient, ActionError } from "@/lib/safe-action";
import { getStripe } from "@/lib/stripe";
import { setStripeConnectAccountId } from "@/lib/services/organization-service";
import { getTenantUrl } from "@/lib/tenant-host";
import { db } from "@/lib/db";

export const createConnectOnboarding = staffWriteActionClient({ billing: ["manage"] }).action(
  async ({ ctx }) => {
    if (!process.env.NEXT_PUBLIC_APP_URL) throw new ActionError("NEXT_PUBLIC_APP_URL não configurada.");
    const stripe = getStripe();
    let accountId = ctx.organization.stripeConnectAccountId;
    if (!accountId) {
      // País vem do local principal do tenant, não mais fixo em "DE" — cada
      // barbearia pode estar em qualquer país suportado pelo Stripe Connect.
      // Sem local cadastrado ainda, cai no default do schema (Location.countryCode).
      const primaryLocation = await db.location.findFirst({
        orderBy: { createdAt: "asc" },
        select: { countryCode: true },
      });
      const country = primaryLocation?.countryCode ?? "DE";
      let account: Stripe.Account;
      try {
        account = await stripe.accounts.create({
          type: "express",
          country,
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
          metadata: { organizationId: ctx.organization.id },
        });
      } catch (error) {
        // Nem todo país aceito no cadastro de local do tenant é aceito pelo
        // Stripe Connect (depende do país da própria plataforma) — deixamos
        // o Stripe validar (fonte de verdade) em vez de manter uma lista
        // própria que ficaria desatualizada, e traduzimos o erro específico
        // de país pra uma mensagem acionável.
        if (error instanceof Stripe.errors.StripeInvalidRequestError && error.param === "country") {
          throw new ActionError(
            `Não foi possível conectar Stripe: país "${country}" não é suportado para recebimento de pagamentos nesta plataforma. Atualize o país do seu local em Configurações ou contate o suporte.`,
          );
        }
        throw error;
      }
      accountId = account.id;
      await setStripeConnectAccountId(ctx.organization.id, accountId);
    }
    // Mesmo bug de create-booking-payment-checkout.ts: /dashboard/billing só
    // existe sob o subdomínio do tenant, não no domínio raiz.
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: getTenantUrl(ctx.organization.slug, "/dashboard/billing?connect=refresh"),
      return_url: getTenantUrl(ctx.organization.slug, "/dashboard/billing?connect=complete"),
    });
    // Retorna só o campo usado pelo cliente — objeto do SDK do Stripe não é
    // plain object, gerava aviso de serialização no console.
    return { url: accountLink.url };
  },
);
