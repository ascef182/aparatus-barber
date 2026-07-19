import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { createSafeActionClient } from "next-safe-action";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission, type PermissionCheck } from "@/lib/auth/permissions";
import { getOrganizationBySlug, isFreeTrialExpired } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { runWithPlatformScope, runWithTenant } from "@/lib/tenant-context";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logger, runWithRequestContext } from "@/lib/logger";

/** Erro de negócio cuja mensagem pode ser exibida ao usuário. */
export class ActionError extends Error {}

const baseActionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof ActionError) {
      return error.message;
    }
    logger().error({ err: error }, "Unexpected server action error");
    Sentry.captureException(error);
    return "Erro interno. Tente novamente.";
  },
});

/** requestId gerado uma vez por invocação de action, propagado via ALS
 * (lib/logger.ts) para todo log emitido durante essa execução. */
export const actionClient = baseActionClient.use(({ next }) =>
  runWithRequestContext({ requestId: randomUUID() }, () => next({ ctx: {} })),
);

/**
 * Cliente para actions que exigem usuário autenticado.
 * Sessão resolvida uma única vez aqui — actions não chamam auth.api.getSession.
 */
export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new ActionError("Unauthorized");
  }
  return next({ ctx: { user: session.user, session: session.session } });
});

/**
 * Ações públicas do subdomínio do tenant, sem sessão de cliente. Rate
 * limitado por IP+tenant — protege o wizard público de agendamento (e o
 * checkout que ele dispara) contra abuso de criação de holds.
 */
export const publicTenantActionClient = actionClient.use(async ({ next }) => {
  const slug = resolveTenantSlug((await headers()).get("host"));
  if (!slug) throw new ActionError("Tenant não identificado.");
  const organization = await getOrganizationBySlug(slug);
  if (
    !organization ||
    organization.status === "SUSPENDED" ||
    organization.status === "CHURNED" ||
    isFreeTrialExpired(organization)
  ) {
    throw new ActionError("Organização indisponível.");
  }
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`public-tenant-action:${ip}:${organization.id}`, {
    windowSeconds: 60,
    max: 20,
  });
  if (!allowed) throw new ActionError("Muitas tentativas. Aguarde um minuto e tente novamente.");
  return runWithTenant(organization.id, () => next({ ctx: { organization } }));
});

/**
 * Cliente para actions executadas no contexto de um tenant.
 * A organização é resolvida do HOST (subdomínio) — nunca de input do cliente —
 * e o tenant context (AsyncLocalStorage) é ativado para a Prisma extension
 * de escopo. Ver plano de reestruturação, seções 2 e 5.
 */
export const tenantActionClient = authActionClient.use(async ({ next }) => {
  const slug = resolveTenantSlug((await headers()).get("host"));
  if (!slug) {
    throw new ActionError("Tenant não identificado.");
  }
  const organization = await getOrganizationBySlug(slug);
  if (
    !organization ||
    organization.status === "SUSPENDED" ||
    organization.status === "CHURNED"
  ) {
    throw new ActionError("Organização indisponível.");
  }
  return runWithTenant(organization.id, () => next({ ctx: { organization } }));
});

/**
 * Cliente para actions de staff do tenant (dashboard), exigindo membership
 * com a permissão dada. Ex.: staffActionClient({ service: ["manage"] }).
 */
export function staffActionClient(permission: PermissionCheck) {
  return tenantActionClient.use(async ({ next, ctx }) => {
    const membership = await getMembership(ctx.organization.id, ctx.user.id);
    if (!membership || !hasPermission(membership.role, permission)) {
      throw new ActionError("Sem permissão para esta ação.");
    }
    return next({ ctx: { membership } });
  });
}

/**
 * Cliente para actions de staff que ESCREVEM dado de negócio (criar/editar
 * serviço, staff, cliente, convite, configurações, Stripe Connect...).
 * Composto sobre staffActionClient: além da RBAC, bloqueia quando a
 * organização nunca assinou e passou dos 7 dias de teste grátis (ver
 * isFreeTrialExpired) — independente da RBAC, é um segundo gate ortogonal.
 * Leituras continuam em staffActionClient normal, sem essa trava.
 */
export function staffWriteActionClient(permission: PermissionCheck) {
  return staffActionClient(permission).use(async ({ next, ctx }) => {
    if (isFreeTrialExpired(ctx.organization)) {
      throw new ActionError("Seu período de teste gratuito de 7 dias terminou. Assine um plano para continuar.");
    }
    return next({ ctx });
  });
}

/**
 * Cliente para actions da plataforma (SuperAdmin) — escopo cross-tenant
 * explícito via runWithPlatformScope.
 */
export const platformAdminActionClient = authActionClient.use(
  async ({ next, ctx }) => {
    if (ctx.user.role !== "superadmin") {
      throw new ActionError("Unauthorized");
    }
    return runWithPlatformScope(() => next({ ctx: {} }));
  },
);
