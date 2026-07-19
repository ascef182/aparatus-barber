import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/services/member-service";
import { hasPermission } from "@/lib/auth/permissions";
import { serviceSchema } from "@/app/_actions/manage-operations.schemas";

/**
 * Fecha o gap entre o teste puro de hasPermission (tests/permissions.test.ts)
 * e o uso real em staffActionClient (lib/safe-action.ts), que compõe
 * getMembership (DB) + hasPermission (matriz de papéis). Invocar as actions
 * exportadas exigiria mockar next/headers + sessão do Better Auth — não
 * usado em nenhum outro teste do projeto; em vez disso, exercitamos a MESMA
 * dupla de funções que o middleware do safe-action chama, contra um
 * membership real no Postgres.
 *
 * A segunda garantia estrutural (organizationId do cliente é sempre
 * ignorado) é testada direto no schema Zod da action: nenhuma action tem
 * `organizationId` no input, e o Zod descarta campos desconhecidos por
 * padrão — aqui provamos que um valor injetado não sobrevive ao parse.
 */

const org = { id: randomUUID(), slug: `rbac-${randomUUID().slice(0, 8)}` };
const ownerUserId = randomUUID();
const professionalUserId = randomUUID();

beforeAll(async () => {
  await prisma.organization.create({ data: { id: org.id, name: "RBAC Org", slug: org.slug } });
  await prisma.user.createMany({
    data: [
      { id: ownerUserId, name: "Owner", email: `owner-${ownerUserId}@example.com` },
      { id: professionalUserId, name: "Pro", email: `pro-${professionalUserId}@example.com` },
    ],
  });
  await prisma.member.createMany({
    data: [
      { id: randomUUID(), organizationId: org.id, userId: ownerUserId, role: "owner" },
      { id: randomUUID(), organizationId: org.id, userId: professionalUserId, role: "professional" },
    ],
  });
});

afterAll(async () => {
  await prisma.member.deleteMany({ where: { organizationId: org.id } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerUserId, professionalUserId] } } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("RBAC de actions — getMembership (DB) + hasPermission", () => {
  test("professional não passa em service:manage (o que staffActionClient({service:['manage']}) exige)", async () => {
    const membership = await getMembership(org.id, professionalUserId);
    expect(membership).not.toBeNull();
    expect(hasPermission(membership!.role, { service: ["manage"] })).toBe(false);
  });

  test("owner passa em service:manage", async () => {
    const membership = await getMembership(org.id, ownerUserId);
    expect(membership).not.toBeNull();
    expect(hasPermission(membership!.role, { service: ["manage"] })).toBe(true);
  });

  test("usuário sem membership no tenant nunca passa (nem sem permissão nenhuma)", async () => {
    const membership = await getMembership(org.id, randomUUID());
    expect(membership).toBeNull();
  });
});

describe("organizationId do cliente é sempre ignorado pelo input schema da action", () => {
  test("createService: organizationId injetado no payload não sobrevive ao parse", () => {
    const parsed = serviceSchema.parse({
      name: "Corte",
      durationMinutes: 30,
      priceInCents: 3000,
      organizationId: "org-de-outro-tenant",
    } as unknown);
    expect(parsed).not.toHaveProperty("organizationId");
  });
});
