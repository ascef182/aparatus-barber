"use server";
import { APIError } from "better-auth";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ActionError, authActionClient } from "@/lib/safe-action";
import { db } from "@/lib/db";
import { createLocation } from "@/lib/services/location-service";
import { runWithTenant } from "@/lib/tenant-context";
import {
  getOrganizationByStripeSubscriptionId,
  updateSubscriptionFromStripe,
} from "@/lib/services/organization-service";
import { retrieveClaimableCheckoutSession } from "@/lib/services/subscription-claim-service";
import { getStripe } from "@/lib/stripe";
import { logAuditEvent } from "@/lib/services/audit-service";
import { ensureMfaGracePeriod } from "@/lib/services/member-service";
import { upsertImpressum } from "@/lib/services/impressum-service";

const inputSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens.",
    ),
  addressLine1: z.string().min(3).max(120),
  postalCode: z.string().min(3).max(12),
  city: z.string().min(2).max(80),
  phone: z.string().max(40).optional(),
  description: z.string().max(500).optional(),
  // Impressum (§5 TMG) — coletado aqui, não só depois no dashboard, porque
  // sem ele o wizard de agendamento público fica bloqueado para filiais
  // alemãs (app/t/[slug]/page.tsx) desde a primeira visita.
  legalName: z.string().min(2).max(160),
  representedBy: z.string().max(160).optional(),
  contactEmail: z.email().optional(),
  country: z.string().length(2).default("DE"),
  registerCourt: z.string().max(120).optional(),
  registerNumber: z.string().max(60).optional(),
  vatId: z.string().max(40).optional(),
  // Checkout Session criado em start-plan-checkout.ts, antes de existir
  // conta/organização (funil pay-first) — quando presente, a Organization
  // nasce já com assinatura ativa. Ausente = cadastro grátis via /sign-up;
  // a Organization nasce nos defaults do Prisma (TRIALING, sem plano) e o
  // paywall de 7 dias (isFreeTrialExpired) passa a valer.
  sessionId: z.string().min(1).optional(),
  dpaAccepted: z.literal(true, "É necessário aceitar o Acordo de Processamento de Dados (DPA)."),
});

/**
 * Cria a Organization + filial padrão E, no mesmo passo, reivindica a
 * assinatura Stripe iniciada antes do cadastro (funil pay -> sign up ->
 * onboarding). O Checkout Session é revalidado 100% server-side aqui —
 * nunca confiamos em plano/e-mail vindos do cliente.
 */
export const createOrganization = authActionClient
  .inputSchema(inputSchema)
  .action(
    async ({ parsedInput: {
      name, slug, addressLine1, postalCode, city, sessionId,
      phone, description, legalName, representedBy, contactEmail, country,
      registerCourt, registerNumber, vatId,
    }, ctx }) => {
      let claim: Awaited<ReturnType<typeof retrieveClaimableCheckoutSession>> = null;
      if (sessionId) {
        claim = await retrieveClaimableCheckoutSession(sessionId);
        if (!claim) {
          throw new ActionError("Sessão de pagamento inválida ou expirada. Escolha um plano novamente.");
        }
        if (claim.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
          throw new ActionError("Esta assinatura foi paga com outro e-mail.");
        }
        const alreadyClaimed = await getOrganizationByStripeSubscriptionId(claim.stripeSubscriptionId);
        if (alreadyClaimed) {
          throw new ActionError("Esta assinatura já está vinculada a uma conta. Faça login.");
        }
      }

      let organization;
      try {
        // Cria organization + member owner via plugin do Better Auth.
        organization = await auth.api.createOrganization({
          body: { name, slug },
          headers: await headers(),
        });
      } catch (error) {
        if (error instanceof APIError) {
          throw new ActionError(
            error.message || "Não foi possível criar a organização.",
          );
        }
        throw error;
      }
      if (!organization) {
        throw new ActionError("Não foi possível criar a organização.");
      }

      if (claim) {
        await updateSubscriptionFromStripe(organization.id, {
          plan: claim.plan,
          stripeSubscriptionId: claim.stripeSubscriptionId,
          stripeCustomerId: claim.stripeCustomerId,
          status: claim.subscriptionStatus,
          currentPeriodEnd: claim.currentPeriodEnd,
          trialEndsAt: claim.trialEndsAt,
          gracePeriodEndsAt: null,
        });
        // A subscription pré-cadastro (start-plan-checkout.ts) nasce sem
        // organizationId no metadata Stripe — sem esse backfill, eventos de
        // cancelamento/past_due do webhook de billing nunca desatualizariam
        // o acesso desta org (o fallback por stripeSubscriptionId no webhook
        // é a segunda camada de defesa para isso, não a única).
        await getStripe().subscriptions.update(claim.stripeSubscriptionId, {
          metadata: { organizationId: organization.id, plan: claim.plan },
        });
      }
      // Sem claim (cadastro grátis via /sign-up): a Organization fica nos
      // defaults do Prisma (status/subscriptionStatus=TRIALING, sem plano,
      // sem stripeSubscriptionId) — isFreeTrialExpired() passa a contar os
      // 7 dias de graça a partir de createdAt.

      await ensureMfaGracePeriod(organization.id, ctx.user.id);

      const requestHeaders = await headers();
      // Location + Impressum + audit logs commitam ou falham juntos: uma
      // Organization nunca deve existir sem o Impressum que desbloqueia o
      // agendamento público (app/t/[slug]/page.tsx) para filiais alemãs.
      try {
        await runWithTenant(organization.id, () =>
          db.$transaction(async (tx) => {
            await createLocation(
              { name, addressLine1, postalCode, city, countryCode: country, phone, description },
              tx,
            );
            const impressum = await upsertImpressum(
              { legalName, addressLine1, postalCode, city, country, representedBy, phone, email: contactEmail, registerCourt, registerNumber, vatId },
              ctx.user.id,
              tx,
            );
            await logAuditEvent(
              {
                actorId: ctx.user.id,
                entity: "Organization",
                entityId: organization.id,
                action: "DPA_ACCEPTED",
                metadata: {
                  version: "1.0",
                  ip: requestHeaders.get("x-forwarded-for"),
                  userAgent: requestHeaders.get("user-agent"),
                },
              },
              tx,
            );
            await logAuditEvent(
              {
                actorId: ctx.user.id,
                entity: "TenantImpressum",
                entityId: impressum.id,
                action: "IMPRESSUM_UPDATED",
              },
              tx,
            );
          }),
        );
      } catch (error) {
        // Organization + assinatura Stripe já existem neste ponto (não dá
        // pra desfazer o Better Auth/Stripe aqui) — loga com organizationId
        // explícito (platform scope) pra ficar descobrível, já que fica sem
        // Location/Impressum e o retry do wizard (mesmo slug) é o caminho de
        // recuperação real para o usuário.
        await logAuditEvent({
          organizationId: organization.id,
          actorId: ctx.user.id,
          entity: "Organization",
          entityId: organization.id,
          action: "ONBOARDING_FAILED",
          metadata: { message: String(error) },
        });
        throw error;
      }

      return { id: organization.id, slug: organization.slug };
    },
  );
