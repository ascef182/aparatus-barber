import { prisma } from "@/lib/prisma";

/**
 * Account/User são tabelas do Better Auth (sem organizationId) — usa o
 * client cru (lib/prisma), mesmo padrão de Member/Invitation (ver
 * comentário em lib/db.ts), não o client escopado por tenant (lib/db).
 */
export async function hasCredentialAccount(userId: string): Promise<boolean> {
  const count = await prisma.account.count({
    where: { userId, providerId: "credential" },
  });
  return count > 0;
}
