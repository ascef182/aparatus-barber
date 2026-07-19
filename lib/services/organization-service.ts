import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import { logAuditEvent } from "@/lib/services/audit-service";

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

/** Banner "complete seu setup" no dashboard — sem schema novo, deriva de dados existentes. */
export async function isSetupComplete(organizationId: string): Promise<boolean> {
  const [hasWorkingHours, hasActiveService, hasStaffService] = await Promise.all([
    prisma.staffWorkingHours.findFirst({ where: { organizationId } }),
    prisma.service.findFirst({ where: { organizationId, isActive: true } }),
    prisma.staffService.findFirst({ where: { organizationId } }),
  ]);
  return !!hasWorkingHours && !!hasActiveService && !!hasStaffService;
}

const FREE_GRACE_PERIOD_DAYS = 7;

/**
 * Organização nunca teve uma subscription Stripe real (cadastro grátis, sem
 * Checkout) e passou dos 7 dias de graça desde a criação. Não usa a coluna
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
    organization.createdAt.getTime() + FREE_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );
  return deadline < new Date();
}

/** Toggle do diretório público (app/(marketing)/find) — opt-in do dono/manager. */
export function setDirectoryListing(organizationId: string, isListed: boolean) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { isListed, listedAt: isListed ? new Date() : null },
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
