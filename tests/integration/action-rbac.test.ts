import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithPlatformScope, runWithTenant } from "@/lib/tenant-context";
import { getMembership } from "@/lib/services/member-service";
import { hasPermission } from "@/lib/auth/permissions";
import { serviceSchema } from "@/app/_actions/manage-operations.schemas";
import {
  assertOwnBookingAccess,
  getOwnStaffId,
} from "@/lib/authz";

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

  test("professional não passa em booking:create (o que create-manual-booking exige) — só read_own/update/cancel", async () => {
    const membership = await getMembership(org.id, professionalUserId);
    expect(membership).not.toBeNull();
    expect(hasPermission(membership!.role, { booking: ["create"] })).toBe(false);
    expect(hasPermission(membership!.role, { booking: ["read_own"] })).toBe(true);
  });

  test("owner passa em booking:create", async () => {
    const membership = await getMembership(org.id, ownerUserId);
    expect(membership).not.toBeNull();
    expect(hasPermission(membership!.role, { booking: ["create"] })).toBe(true);
  });

  test("professional/receptionist não passam em staff:manage — edição de staff é RBAC-gated (owner/manager), não um caso de posse", () => {
    expect(hasPermission("professional", { staff: ["manage"] })).toBe(false);
    expect(hasPermission("receptionist", { staff: ["manage"] })).toBe(false);
    expect(hasPermission("owner", { staff: ["manage"] })).toBe(true);
    expect(hasPermission("manager", { staff: ["manage"] })).toBe(true);
  });
});

describe("Ownership dentro do mesmo tenant — lib/authz.ts", () => {
  const authzOrgId = randomUUID();
  const authzOrgSlug = `authz-${randomUUID().slice(0, 8)}`;
  const managerUserId = randomUUID();
  const proAUserId = randomUUID();
  const proBUserId = randomUUID();
  const proNoStaffUserId = randomUUID();
  const managerMembershipId = randomUUID();
  const proAMembershipId = randomUUID();
  const proBMembershipId = randomUUID();
  const proNoStaffMembershipId = randomUUID();
  let staffA: { id: string };
  let staffB: { id: string };

  beforeAll(async () => {
    await prisma.organization.create({
      data: { id: authzOrgId, name: "Authz Org", slug: authzOrgSlug },
    });
    await prisma.user.createMany({
      data: [
        { id: managerUserId, name: "Manager", email: `manager-${managerUserId}@example.com` },
        { id: proAUserId, name: "Pro A", email: `proa-${proAUserId}@example.com` },
        { id: proBUserId, name: "Pro B", email: `prob-${proBUserId}@example.com` },
        { id: proNoStaffUserId, name: "Pro No Staff", email: `prons-${proNoStaffUserId}@example.com` },
      ],
    });
    await prisma.member.createMany({
      data: [
        { id: managerMembershipId, organizationId: authzOrgId, userId: managerUserId, role: "manager" },
        { id: proAMembershipId, organizationId: authzOrgId, userId: proAUserId, role: "professional" },
        { id: proBMembershipId, organizationId: authzOrgId, userId: proBUserId, role: "professional" },
        { id: proNoStaffMembershipId, organizationId: authzOrgId, userId: proNoStaffUserId, role: "professional" },
      ],
    });
    const location = await runWithTenant(authzOrgId, () =>
      db.location.create({
        data: {
          organizationId: authzOrgId,
          name: "Filial Authz",
          addressLine1: "Rua X",
          postalCode: "00000",
          city: "Cidade",
        },
      }),
    );
    staffA = await runWithTenant(authzOrgId, () =>
      db.staff.create({
        data: {
          organizationId: authzOrgId,
          locationId: location.id,
          displayName: "Barbeiro A",
          memberId: proAMembershipId,
        },
      }),
    );
    staffB = await runWithTenant(authzOrgId, () =>
      db.staff.create({
        data: {
          organizationId: authzOrgId,
          locationId: location.id,
          displayName: "Barbeiro B",
          memberId: proBMembershipId,
        },
      }),
    );
  });

  afterAll(async () => {
    await runWithPlatformScope(async () => {
      await db.staff.deleteMany({ where: { organizationId: authzOrgId } });
      await db.location.deleteMany({ where: { organizationId: authzOrgId } });
    });
    await prisma.member.deleteMany({ where: { organizationId: authzOrgId } });
    await prisma.user.deleteMany({
      where: { id: { in: [managerUserId, proAUserId, proBUserId, proNoStaffUserId] } },
    });
    await prisma.organization.delete({ where: { id: authzOrgId } });
  });

  test("professional pode agir na própria reserva (mesmo tenant)", async () => {
    await expect(
      runWithTenant(authzOrgId, () =>
        assertOwnBookingAccess(
          { staffId: staffA.id },
          { id: proAMembershipId, role: "professional" },
          "not found",
        ),
      ),
    ).resolves.toBeUndefined();
  });

  test("professional NÃO pode agir na reserva de outro profissional (mesmo tenant)", async () => {
    await expect(
      runWithTenant(authzOrgId, () =>
        assertOwnBookingAccess(
          { staffId: staffB.id },
          { id: proAMembershipId, role: "professional" },
          "not found",
        ),
      ),
    ).rejects.toThrow("not found");
  });

  test("manager não é restrito por staffId — acesso ao tenant inteiro é intencional", async () => {
    await expect(
      runWithTenant(authzOrgId, () =>
        assertOwnBookingAccess(
          { staffId: staffB.id },
          { id: managerMembershipId, role: "manager" },
          "not found",
        ),
      ),
    ).resolves.toBeUndefined();
  });

  test("professional sem Staff vinculado não é dono de nada (fail-closed)", async () => {
    await expect(
      runWithTenant(authzOrgId, () =>
        assertOwnBookingAccess(
          { staffId: staffA.id },
          { id: proNoStaffMembershipId, role: "professional" },
          "not found",
        ),
      ),
    ).rejects.toThrow("not found");
  });

  test("getOwnStaffId resolve o Staff vinculado ao membership, ou null se não houver", async () => {
    await expect(
      runWithTenant(authzOrgId, () => getOwnStaffId(proAMembershipId)),
    ).resolves.toBe(staffA.id);
    await expect(
      runWithTenant(authzOrgId, () => getOwnStaffId(proNoStaffMembershipId)),
    ).resolves.toBeNull();
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
