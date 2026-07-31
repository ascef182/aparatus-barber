import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/tenant-context";
import { isSetupComplete, setDirectoryListing, autoListDirectory } from "@/lib/services/organization-service";

/**
 * O gate em si (app/(protected)/dashboard/layout.tsx) roda num Server
 * Component sem cobertura direta (mesma limitação documentada em
 * tests/integration/mfa-enforcement.test.ts) — aqui exercitamos as peças
 * testáveis isoladamente: isSetupComplete, autoListDirectory e a interação
 * entre listagem automática e o toggle manual.
 */

const org = { id: randomUUID(), slug: `autolist-${randomUUID().slice(0, 8)}` };
let locationId: string;
let staffId: string;
let serviceId: string;

beforeAll(async () => {
  await prisma.organization.create({ data: { id: org.id, name: "Auto-listing Org", slug: org.slug } });
  const location = await runWithTenant(org.id, () =>
    db.location.create({
      data: { organizationId: org.id, name: "Sede", addressLine1: "x", postalCode: "x", city: "x" },
    }),
  );
  locationId = location.id;
});

afterAll(async () => {
  await runWithTenant(org.id, async () => {
    await db.staffService.deleteMany({ where: { organizationId: org.id } });
    await db.staffWorkingHours.deleteMany({ where: { organizationId: org.id } });
    await db.staff.deleteMany({ where: { organizationId: org.id } });
    await db.service.deleteMany({ where: { organizationId: org.id } });
    await db.location.deleteMany({ where: { organizationId: org.id } });
  });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("isSetupComplete", () => {
  test("falso até working hours, serviço ativo e vínculo staff-serviço existirem juntos", async () => {
    expect(await isSetupComplete(org.id)).toBe(false);

    staffId = (
      await runWithTenant(org.id, () =>
        db.staff.create({ data: { organizationId: org.id, locationId, displayName: "Barbeiro" } }),
      )
    ).id;
    expect(await isSetupComplete(org.id)).toBe(false);

    await runWithTenant(org.id, () =>
      db.staffWorkingHours.create({
        data: { organizationId: org.id, staffId, weekday: 1, startTime: "09:00", endTime: "18:00" },
      }),
    );
    expect(await isSetupComplete(org.id)).toBe(false);

    serviceId = (
      await runWithTenant(org.id, () =>
        db.service.create({ data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceInCents: 2000 } }),
      )
    ).id;
    expect(await isSetupComplete(org.id)).toBe(false);
  });

  test("verdadeiro assim que o vínculo staff-serviço fecha as 3 condições", async () => {
    await runWithTenant(org.id, () => db.staffService.create({ data: { organizationId: org.id, staffId, serviceId } }));
    expect(await isSetupComplete(org.id)).toBe(true);
  });
});

describe("gate de listagem automática (mesma composição de dashboard/layout.tsx: `if (setupComplete) autoListDirectory(...)`)", () => {
  test("setup incompleto: gate nem chama autoListDirectory, organização não é listada", async () => {
    const other = { id: randomUUID(), slug: `autolist-b-${randomUUID().slice(0, 8)}` };
    await prisma.organization.create({ data: { id: other.id, name: "Org B", slug: other.slug } });

    const setupComplete = await isSetupComplete(other.id);
    expect(setupComplete).toBe(false);
    if (setupComplete) await autoListDirectory(other.id);

    const after = await prisma.organization.findUniqueOrThrow({ where: { id: other.id } });
    expect(after.isListed).toBe(false);

    await prisma.organization.delete({ where: { id: other.id } });
  });
});

describe("autoListDirectory", () => {
  test("lista automaticamente assim que o setup está completo", async () => {
    const before = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(before.isListed).toBe(false);
    expect(await isSetupComplete(org.id)).toBe(true);

    await autoListDirectory(org.id);

    const after = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(after.isListed).toBe(true);
    expect(after.listedAt).not.toBeNull();
    expect(after.directoryListingSetByOwner).toBe(false);
  });

  test("chamado de novo (ex.: próxima visita ao dashboard) é um no-op", async () => {
    const before = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    await autoListDirectory(org.id);
    const after = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(after.listedAt?.getTime()).toBe(before.listedAt?.getTime());
  });

  test("toggle manual pra desligar é respeitado — autoListDirectory nunca religa sozinho", async () => {
    await setDirectoryListing(org.id, false);
    const afterUnlist = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(afterUnlist.isListed).toBe(false);
    expect(afterUnlist.directoryListingSetByOwner).toBe(true);

    // Setup continua completo — é exatamente o que roda na próxima visita
    // ao dashboard (app/(protected)/dashboard/layout.tsx).
    expect(await isSetupComplete(org.id)).toBe(true);
    await autoListDirectory(org.id);

    const after = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(after.isListed).toBe(false);
  });

  test("toggle manual pra ligar também trava o gate automático (idempotente, sem efeito colateral)", async () => {
    await setDirectoryListing(org.id, true);
    await autoListDirectory(org.id);
    const after = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(after.isListed).toBe(true);
    expect(after.directoryListingSetByOwner).toBe(true);
  });
});
