import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { listOrganizationsForUser } from "@/lib/services/member-service";

/**
 * Cobre a peça que /sign-in usa para decidir o redirect pós-login: zero,
 * uma ou múltiplas organizações para o mesmo usuário (ex.: profissional
 * convidado por mais de uma barbearia).
 */

const orgA = { id: randomUUID(), slug: `signin-a-${randomUUID().slice(0, 8)}` };
const orgB = { id: randomUUID(), slug: `signin-b-${randomUUID().slice(0, 8)}` };
const multiOrgUserId = randomUUID();
const noOrgUserId = randomUUID();

beforeAll(async () => {
  await prisma.organization.createMany({
    data: [
      { id: orgA.id, name: "Barbearia A", slug: orgA.slug },
      { id: orgB.id, name: "Barbearia B", slug: orgB.slug },
    ],
  });
  await prisma.user.createMany({
    data: [
      { id: multiOrgUserId, name: "Multi", email: `multi-${multiOrgUserId}@example.com` },
      { id: noOrgUserId, name: "NoOrg", email: `noorg-${noOrgUserId}@example.com` },
    ],
  });
  await prisma.member.createMany({
    data: [
      { id: randomUUID(), organizationId: orgA.id, userId: multiOrgUserId, role: "professional" },
      { id: randomUUID(), organizationId: orgB.id, userId: multiOrgUserId, role: "receptionist" },
    ],
  });
});

afterAll(async () => {
  await prisma.member.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [multiOrgUserId, noOrgUserId] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  await prisma.$disconnect();
});

describe("listOrganizationsForUser", () => {
  test("retorna todas as organizações de um usuário com múltiplas memberships", async () => {
    const memberships = await listOrganizationsForUser(multiOrgUserId);
    expect(memberships).toHaveLength(2);
    const slugs = memberships.map((m) => m.organization.slug).sort();
    expect(slugs).toEqual([orgA.slug, orgB.slug].sort());
  });

  test("retorna lista vazia para usuário sem nenhuma membership", async () => {
    expect(await listOrganizationsForUser(noOrgUserId)).toEqual([]);
  });

  test("retorna lista vazia para usuário inexistente", async () => {
    expect(await listOrganizationsForUser(randomUUID())).toEqual([]);
  });
});
