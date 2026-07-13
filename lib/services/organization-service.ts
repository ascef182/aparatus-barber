import { prisma } from "@/lib/prisma";

// Organization é o próprio limite do tenant — model global, client cru.

export function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

export function getOrganizationById(id: string) {
  return prisma.organization.findUnique({ where: { id } });
}
