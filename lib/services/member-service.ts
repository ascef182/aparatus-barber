import { prisma } from "@/lib/prisma";

// Member é gerenciado pelo plugin organization do Better Auth (client cru);
// aqui apenas leitura para enforcement de RBAC.

export function getMembership(organizationId: string, userId: string) {
  return prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
}

/** Usado pela erasure GDPR: só deleta o User global quando essa contagem é
 * zero (owner não pode se autoerasar e deletar o próprio negócio). */
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

/** E-mail de destino pra notificações operacionais (ex.: pedido de
 * orçamento) sem contexto de tenant ativo (worker) — dono é sempre único
 * por organização, então "primeiro membro owner" já resolve sem ambiguidade. */
export async function getOwnerEmail(organizationId: string): Promise<string | null> {
  const owner = await prisma.member.findFirst({
    where: { organizationId, role: "owner" },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return owner?.user.email ?? null;
}

/** Checagem redundante de posse antes de delegar remove/updateRole ao Better
 * Auth — hoje não é explorável (o próprio better-auth já rejeita um memberId
 * de outra organização), mas guarda contra uma futura mudança de
 * comportamento e mantém a mensagem de erro consistente com a convenção do
 * projeto. */
export function getMemberById(organizationId: string, memberId: string) {
  return prisma.member.findFirst({ where: { id: memberId, organizationId } });
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
const MFA_REMINDER_WINDOW_HOURS = 24;

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

/**
 * Owners (ou superadmins) cujo prazo de graça de 2FA expira nas próximas
 * MFA_REMINDER_WINDOW_HOURS e que ainda não ativaram 2FA nem receberam o
 * lembrete — usado pelo job de varredura do worker (booking-maintenance).
 * mfaGracePeriodReminderSentAt evita reenvio a cada execução do sweep.
 */
export async function listMembersNeedingMfaReminder() {
  const windowEnd = new Date(Date.now() + MFA_REMINDER_WINDOW_HOURS * 60 * 60 * 1000);
  return prisma.member.findMany({
    where: {
      role: "owner",
      mfaGracePeriodEndsAt: { not: null, lte: windowEnd, gt: new Date() },
      mfaGracePeriodReminderSentAt: null,
      // twoFactorEnabled é nullable (Better Auth) — trata null como "não ativado".
      user: { twoFactorEnabled: { not: true } },
    },
    include: {
      user: { select: { email: true, locale: true, twoFactorEnabled: true } },
      organization: { select: { name: true } },
    },
  });
}

export async function markMfaReminderSent(memberId: string) {
  await prisma.member.update({
    where: { id: memberId },
    data: { mfaGracePeriodReminderSentAt: new Date() },
  });
}
