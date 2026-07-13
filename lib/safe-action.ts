import { createSafeActionClient } from "next-safe-action";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission, type PermissionCheck } from "@/lib/auth/permissions";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { runWithPlatformScope, runWithTenant } from "@/lib/tenant-context";

/** Erro de negócio cuja mensagem pode ser exibida ao usuário. */
export class ActionError extends Error {}

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof ActionError) {
      return error.message;
    }
    console.error("Unexpected server action error:", error);
    return "Erro interno. Tente novamente.";
  },
});

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
