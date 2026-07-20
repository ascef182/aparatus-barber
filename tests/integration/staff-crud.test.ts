import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/tenant-context";
import { updateStaffSchema } from "@/app/_actions/manage-operations.schemas";
import { removeMemberSchema, updateMemberRoleSchema } from "@/app/_actions/manage-members.schemas";

/**
 * Cobre o que ficou de fora de tests/permissions.test.ts (matriz pura de
 * hasPermission, já valida staff:manage) e tests/integration/action-rbac.test.ts
 * (organizationId ignorado pelo schema): a lógica de negócio nova do
 * updateStaff (edição + resync de StaffService + desativar/reativar) e a
 * validação dos schemas de manage-members. As actions em si não são
 * invocadas diretamente — exigiria mockar next/headers + sessão do Better
 * Auth, o que nenhum teste do projeto faz (ver nota em action-rbac.test.ts).
 */

const orgA = { id: randomUUID(), slug: `staff-a-${randomUUID().slice(0, 8)}` };
const orgB = { id: randomUUID(), slug: `staff-b-${randomUUID().slice(0, 8)}` };
let locationA: { id: string };
let serviceA1: { id: string };
let serviceA2: { id: string };
let staffA: { id: string };
let staffB: { id: string };

beforeAll(async () => {
  await prisma.organization.createMany({
    data: [
      { id: orgA.id, name: "Tenant A", slug: orgA.slug },
      { id: orgB.id, name: "Tenant B", slug: orgB.slug },
    ],
  });
  locationA = await prisma.location.create({
    data: { organizationId: orgA.id, name: "Filial A", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
  });
  const locationB = await prisma.location.create({
    data: { organizationId: orgB.id, name: "Filial B", addressLine1: "Str 2", postalCode: "80331", city: "München" },
  });
  serviceA1 = await prisma.service.create({
    data: { organizationId: orgA.id, name: "Corte", durationMinutes: 30, priceInCents: 3000 },
  });
  serviceA2 = await prisma.service.create({
    data: { organizationId: orgA.id, name: "Barba", durationMinutes: 20, priceInCents: 2000 },
  });
  staffA = await prisma.staff.create({
    data: { organizationId: orgA.id, locationId: locationA.id, displayName: "Ana" },
  });
  await prisma.staffService.create({ data: { organizationId: orgA.id, staffId: staffA.id, serviceId: serviceA1.id } });
  staffB = await prisma.staff.create({
    data: { organizationId: orgB.id, locationId: locationB.id, displayName: "Bruno" },
  });
});

afterAll(async () => {
  await prisma.staffService.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.staff.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.service.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.location.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  await prisma.$disconnect();
});

describe("updateStaffSchema", () => {
  test("organizationId injetado no payload não sobrevive ao parse", () => {
    const parsed = updateStaffSchema.parse({ id: staffA.id, displayName: "Ana Silva", organizationId: "org-de-outro-tenant" } as unknown);
    expect(parsed).not.toHaveProperty("organizationId");
  });

  test("isActive é opcional e aceita boolean para desativar/reativar", () => {
    const parsed = updateStaffSchema.parse({ id: staffA.id, isActive: false });
    expect(parsed.isActive).toBe(false);
  });

  test("comissão por serviço exige commissionBps mesmo em update parcial", () => {
    expect(() => updateStaffSchema.parse({ id: staffA.id, compensationType: "PER_SERVICE_COMMISSION" })).toThrow();
    const parsed = updateStaffSchema.parse({ id: staffA.id, compensationType: "PER_SERVICE_COMMISSION", commissionBps: 4000 });
    expect(parsed.commissionBps).toBe(4000);
  });

  test("campos omitidos ficam undefined — não zeram dados existentes", () => {
    const parsed = updateStaffSchema.parse({ id: staffA.id, displayName: "Ana Silva" });
    expect(parsed.locationId).toBeUndefined();
    expect(parsed.serviceIds).toBeUndefined();
  });
});

describe("updateStaff — lógica de edição e resync de serviços (mesma sequência da action)", () => {
  test("atualiza campos e substitui os serviços vinculados", async () => {
    await runWithTenant(orgA.id, async () => {
      await db.staff.update({ where: { id: staffA.id }, data: { displayName: "Ana Silva", jobTitle: "Barbeira sênior" } });
      await db.staffService.deleteMany({ where: { staffId: staffA.id } });
      await db.staffService.createMany({ data: [{ organizationId: orgA.id, staffId: staffA.id, serviceId: serviceA2.id }] });
    });

    const updated = await prisma.staff.findUniqueOrThrow({ where: { id: staffA.id }, include: { services: true } });
    expect(updated.displayName).toBe("Ana Silva");
    expect(updated.jobTitle).toBe("Barbeira sênior");
    expect(updated.services.map((s) => s.serviceId)).toEqual([serviceA2.id]);
  });

  test("desativar e reativar alterna isActive preservando o restante dos dados", async () => {
    await runWithTenant(orgA.id, () => db.staff.update({ where: { id: staffA.id }, data: { isActive: false } }));
    let staff = await prisma.staff.findUniqueOrThrow({ where: { id: staffA.id } });
    expect(staff.isActive).toBe(false);
    expect(staff.displayName).toBe("Ana Silva");

    await runWithTenant(orgA.id, () => db.staff.update({ where: { id: staffA.id }, data: { isActive: true } }));
    staff = await prisma.staff.findUniqueOrThrow({ where: { id: staffA.id } });
    expect(staff.isActive).toBe(true);
  });

  test("não é possível atualizar staff de outro tenant pelo id (fail-closed da extension)", async () => {
    await expect(
      runWithTenant(orgA.id, () => db.staff.update({ where: { id: staffB.id }, data: { displayName: "Hack" } })),
    ).rejects.toThrow();
    const untouched = await prisma.staff.findUniqueOrThrow({ where: { id: staffB.id } });
    expect(untouched.displayName).toBe("Bruno");
  });
});

describe("manage-members — schemas", () => {
  test("updateMemberRoleSchema nunca aceita 'owner' como papel atribuível", () => {
    expect(() => updateMemberRoleSchema.parse({ memberId: randomUUID(), role: "owner" })).toThrow();
  });

  test("updateMemberRoleSchema aceita os papéis atribuíveis", () => {
    for (const role of ["manager", "professional", "receptionist"] as const) {
      expect(updateMemberRoleSchema.parse({ memberId: randomUUID(), role }).role).toBe(role);
    }
  });

  test("removeMemberSchema exige memberId", () => {
    expect(() => removeMemberSchema.parse({})).toThrow();
    expect(removeMemberSchema.parse({ memberId: "m1" }).memberId).toBe("m1");
  });
});
