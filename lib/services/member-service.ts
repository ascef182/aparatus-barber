import { prisma } from "@/lib/prisma";

// Member é gerenciado pelo plugin organization do Better Auth (client cru);
// aqui apenas leitura para enforcement de RBAC.

export function getMembership(organizationId: string, userId: string) {
  return prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
}
