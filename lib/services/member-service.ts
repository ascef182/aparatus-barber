import { prisma } from "@/lib/prisma";

// Member é gerenciado pelo plugin organization do Better Auth (client cru);
// aqui apenas leitura para enforcement de RBAC.

export function getMembership(organizationId: string, userId: string) {
  return prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
}

export function countMembershipsForUser(userId: string) {
  return prisma.member.count({ where: { userId } });
}

/** Usado por /sign-in para decidir para qual subdomínio redirecionar após o login. */
export function listOrganizationsForUser(userId: string) {
  return prisma.member.findMany({
    where: { userId },
    include: { organization: { select: { id: true, slug: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function listMembers(organizationId: string) {
  return prisma.member.findMany({
    where: { organizationId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function listPendingInvitations(organizationId: string) {
  return prisma.invitation.findMany({
    where: { organizationId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Better Auth's getInvitation endpoint exige sessão ativa só para LER o
 * convite — inútil para a página de accept-invitation, que precisa mostrar
 * e-mail/organização a um visitante ainda não autenticado. Leitura direta
 * via Prisma bypassa essa exigência; o accept em si continua indo por
 * auth.api.acceptInvitation (que corretamente exige sessão + e-mail igual).
 */
export function getInvitationById(id: string) {
  return prisma.invitation.findUnique({
    where: { id },
    include: { organization: { select: { name: true, slug: true } } },
  });
}

/** Usado pela erasure GDPR — só chamado quando o usuário não tem mais Member ativo. */
export function deleteUserAccount(userId: string) {
  return prisma.user.delete({ where: { id: userId } }).catch(() => null);
}

const MFA_GRACE_PERIOD_DAYS = 7;

/**
 * Prazo guardado (não computado) — chamado na criação da organização (owner)
 * e, como fallback write-on-read, no primeiro dashboard/layout.tsx de quem
 * já tinha Member antes desta feature (nunca recua um prazo já definido).
 */
export async function ensureMfaGracePeriod(organizationId: string, userId: string): Promise<Date | null> {
  const membership = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!membership) return null;
  if (membership.mfaGracePeriodEndsAt) return membership.mfaGracePeriodEndsAt;
  const deadline = new Date(Date.now() + MFA_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  await prisma.member.update({ where: { id: membership.id }, data: { mfaGracePeriodEndsAt: deadline } });
  return deadline;
}
