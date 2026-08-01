import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import type { BusinessCategory, SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import { logAuditEvent } from "@/lib/services/audit-service";
import { runWithTenant } from "@/lib/tenant-context";

// Organization é o próprio limite do tenant — model global, client cru.

export function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

export function getOrganizationById(id: string) {
  return prisma.organization.findUnique({ where: { id } });
}

export function getOrganizationByStripeSubscriptionId(stripeSubscriptionId: string) {
  return prisma.organization.findUnique({ where: { stripeSubscriptionId } });
}

/**
 * Banner "complete seu setup" no dashboard — sem schema novo, deriva de
 * dados existentes.
 *
 * Chamado a partir do layout do dashboard (Server Component), que não
 * passa pela cadeia de safe-action clients e portanto não tem contexto de
 * tenant no AsyncLocalStorage ainda — por isso abre o próprio runWithTenant
 * aqui, usando o organizationId já resolvido via host (nunca input do
 * cliente). Isso também é o que dá a essas leituras a política de RLS
 * (lib/db.ts), que prisma.<model> cru não tinha.
 */
export async function isSetupComplete(organizationId: string): Promise<boolean> {
  return runWithTenant(organizationId, async () => {
    const [hasWorkingHours, hasActiveService, hasStaffService] = await Promise.all([
      db.staffWorkingHours.findFirst(),
      db.service.findFirst({ where: { isActive: true } }),
      db.staffService.findFirst(),
    ]);
    return !!hasWorkingHours && !!hasActiveService && !!hasStaffService;
  });
}

export const TRIAL_DAYS = 14;

/**
 * Organização nunca teve uma subscription Stripe real (cadastro grátis, sem
 * Checkout) e passou do trial desde a criação. Não usa a coluna
 * `gracePeriodEndsAt` — essa é escrita só pelo webhook de billing quando uma
 * assinatura PAGA entra em `past_due` (ver `updateSubscriptionFromStripe`),
 * semântica diferente; reaproveitar colidiria com esse fluxo.
 */
export function isFreeTrialExpired(organization: {
  createdAt: Date;
  stripeSubscriptionId: string | null;
}): boolean {
  if (organization.stripeSubscriptionId) return false;
  const deadline = new Date(
    organization.createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
  );
  return deadline < new Date();
}

/**
 * Toggle manual do diretório público (dashboard/settings) — sempre marca
 * `directoryListingSetByOwner`, pra `autoListDirectory` nunca mais sobrepor
 * essa escolha (ligar de novo depois de um unlist manual, por exemplo). Só
 * deve ser chamada pelo próprio switch de listagem — nunca acoplada a outros
 * campos do formulário (ver updateOrganizationCategory), senão qualquer
 * edição não relacionada trava a flag como efeito colateral.
 */
export function setDirectoryListing(organizationId: string, isListed: boolean) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      isListed,
      listedAt: isListed ? new Date() : null,
      directoryListingSetByOwner: true,
    },
  });
}

/** Categoria do negócio (dashboard/settings) — deliberadamente separada de
 * setDirectoryListing: não deve mexer em isListed/directoryListingSetByOwner. */
export function updateOrganizationCategory(organizationId: string, category: BusinessCategory) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { category },
  });
}

/**
 * Listagem automática no diretório central assim que o setup básico termina
 * (decisão de produto do roadmap — sem opt-in extra). `updateMany` com os
 * dois guards no `where` (ainda não listada E nunca mexida à mão) faz disso
 * uma operação atômica e idempotente: chamado a cada carregamento do
 * dashboard enquanto o setup estiver completo, mas só tem efeito uma vez,
 * e nunca reverte uma escolha manual do dono/manager.
 */
export function autoListDirectory(organizationId: string) {
  return prisma.organization.updateMany({
    where: { id: organizationId, isListed: false, directoryListingSetByOwner: false },
    data: { isListed: true, listedAt: new Date() },
  });
}

/** Capa/hero da página pública (app/t/[slug]) — branding do dono/manager. */
export function setCoverImage(organizationId: string, coverImageUrl: string | null) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { coverImageUrl },
  });
}

export function setStripeConnectAccountId(organizationId: string, accountId: string) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { stripeConnectAccountId: accountId },
  });
}

/** Chamado pelo webhook do Stripe Connect (account.updated), que só traz o
 * accountId — updateMany por stripeConnectAccountId em vez de id primário. */
export function setConnectAccountCapabilities(
  accountId: string,
  data: { chargesEnabled: boolean; payoutsEnabled: boolean },
) {
  return prisma.organization.updateMany({
    where: { stripeConnectAccountId: accountId },
    data,
  });
}

export type SubscriptionUpdate = {
  plan: SubscriptionPlan;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  gracePeriodEndsAt: Date | null;
  stripeCustomerId?: string;
  trialEndsAt?: Date | null;
};

/**
 * Espelha a assinatura Stripe na Organization; CANCELED move o status para
 * CHURNED. Serve tanto a claim inicial (onboarding, com stripeCustomerId +
 * trialEndsAt) quanto as atualizações via webhook de billing.
 */
export async function updateSubscriptionFromStripe(organizationId: string, update: SubscriptionUpdate) {
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionPlan: update.plan,
      stripeSubscriptionId: update.stripeSubscriptionId,
      subscriptionStatus: update.status,
      subscriptionCurrentPeriodEnd: update.currentPeriodEnd,
      gracePeriodEndsAt: update.gracePeriodEndsAt,
      ...(update.stripeCustomerId ? { stripeCustomerId: update.stripeCustomerId } : {}),
      ...(update.trialEndsAt !== undefined ? { trialEndsAt: update.trialEndsAt } : {}),
      ...(update.status === "CANCELED" ? { status: "CHURNED" as const } : {}),
    },
  });
  await logAuditEvent({
    entity: "Organization",
    action: "SUBSCRIPTION_CHANGED",
    entityId: organizationId,
    organizationId,
    metadata: { plan: update.plan, status: update.status },
  });
  return organization;
}
