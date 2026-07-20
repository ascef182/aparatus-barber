import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import {
  CrossTenantWriteError,
  MissingTenantContextError,
  runWithPlatformScope,
  runWithTenant,
} from "@/lib/tenant-context";
import {
  createLocation,
  getLocationById,
  listLocations,
} from "@/lib/services/location-service";

/**
 * Suites 1 e 2 do plano (seção 8.3): isolamento de tenant na camada de dados.
 * Tenants A e B seedados; toda função tenant-scoped executada no contexto A
 * com recursos de B deve falhar ou retornar vazio — nunca dados de B.
 */

const orgA = { id: randomUUID(), slug: `iso-a-${randomUUID().slice(0, 8)}` };
const orgB = { id: randomUUID(), slug: `iso-b-${randomUUID().slice(0, 8)}` };
let locationA: { id: string };
let locationB: { id: string };

beforeAll(async () => {
  await prisma.organization.createMany({
    data: [
      // GROWTH (limite de 3 locais) porque o teste de createLocation cria uma
      // segunda filial em A além da seedada aqui — Starter (default) já
      // estaria no limite com 1.
      { id: orgA.id, name: "Tenant A", slug: orgA.slug, subscriptionPlan: "GROWTH" },
      { id: orgB.id, name: "Tenant B", slug: orgB.slug },
    ],
  });
  locationA = await runWithTenant(orgA.id, () =>
    createLocation({
      name: "Filial A",
      addressLine1: "Astraße 1",
      postalCode: "10115",
      city: "Berlin",
    }),
  );
  locationB = await runWithTenant(orgB.id, () =>
    createLocation({
      name: "Filial B",
      addressLine1: "Bstraße 2",
      postalCode: "80331",
      city: "München",
    }),
  );
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: { organizationId: { in: [orgA.id, orgB.id] } },
  });
  await prisma.tenantImpressum.deleteMany({
    where: { organizationId: { in: [orgA.id, orgB.id] } },
  });
  await prisma.location.deleteMany({
    where: { organizationId: { in: [orgA.id, orgB.id] } },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: [orgA.id, orgB.id] } },
  });
  await prisma.$disconnect();
});

describe("Suite 2 — extension fail-closed", () => {
  test("query tenant-scoped sem contexto lança MissingTenantContextError", async () => {
    await expect(db.location.findMany()).rejects.toBeInstanceOf(
      MissingTenantContextError,
    );
    await expect(
      db.location.create({
        data: {
          organizationId: orgA.id,
          name: "x",
          addressLine1: "x",
          postalCode: "x",
          city: "x",
        },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);
  });

  test("findMany sem filtro retorna apenas o tenant do contexto", async () => {
    const locations = await runWithTenant(orgA.id, () =>
      db.location.findMany(),
    );
    expect(locations.length).toBeGreaterThan(0);
    expect(locations.every((l) => l.organizationId === orgA.id)).toBe(true);
  });

  test("findUnique por id de outro tenant retorna null", async () => {
    const found = await runWithTenant(orgA.id, () =>
      db.location.findUnique({ where: { id: locationB.id } }),
    );
    expect(found).toBeNull();
  });

  test("update/delete em registro de outro tenant falha (não encontrado)", async () => {
    await expect(
      runWithTenant(orgA.id, () =>
        db.location.update({
          where: { id: locationB.id },
          data: { name: "hacked" },
        }),
      ),
    ).rejects.toThrow();
    await expect(
      runWithTenant(orgA.id, () =>
        db.location.delete({ where: { id: locationB.id } }),
      ),
    ).rejects.toThrow();
    // B permanece intacta:
    const b = await prisma.location.findUnique({ where: { id: locationB.id } });
    expect(b?.name).toBe("Filial B");
  });

  test("create com organizationId de outro tenant é bloqueado", async () => {
    await expect(
      runWithTenant(orgA.id, () =>
        db.location.create({
          data: {
            organizationId: orgB.id,
            name: "intruso",
            addressLine1: "x",
            postalCode: "x",
            city: "x",
          },
        }),
      ),
    ).rejects.toBeInstanceOf(CrossTenantWriteError);
  });

  test("updateMany não vaza para outro tenant", async () => {
    const result = await runWithTenant(orgA.id, () =>
      db.location.updateMany({ data: { isActive: true } }),
    );
    expect(result.count).toBeGreaterThan(0);
    const all = await prisma.location.findMany({
      where: { organizationId: orgB.id },
    });
    expect(all.every((l) => l.name !== "hacked")).toBe(true);
  });

  test("platform scope (SuperAdmin) enxerga todos os tenants", async () => {
    const locations = await runWithPlatformScope(() =>
      db.location.findMany({
        where: { organizationId: { in: [orgA.id, orgB.id] } },
      }),
    );
    const orgIds = new Set(locations.map((l) => l.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("models globais não exigem contexto", async () => {
    await expect(
      db.organization.findUnique({ where: { id: orgA.id } }),
    ).resolves.not.toBeNull();
  });

  test("AuditLog: fail-closed sem contexto, escopado sob tenant, bypass em platform scope", async () => {
    await expect(
      db.auditLog.create({
        data: { entity: "Booking", action: "BOOKING_CREATED" },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await runWithTenant(orgA.id, () =>
      db.auditLog.create({
        data: { entity: "Booking", action: "BOOKING_CREATED", entityId: "b-a" },
      }),
    );
    await runWithTenant(orgB.id, () =>
      db.auditLog.create({
        data: { entity: "Booking", action: "BOOKING_CREATED", entityId: "b-b" },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.auditLog.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.entityId === "b-b")).toBe(false);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.auditLog.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("TenantImpressum: fail-closed sem contexto, escopado sob tenant", async () => {
    await expect(
      db.tenantImpressum.create({
        data: { organizationId: orgA.id, legalName: "x", addressLine1: "x", postalCode: "x", city: "x", updatedBy: "u" },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await runWithTenant(orgA.id, () =>
      db.tenantImpressum.create({
        data: { organizationId: orgA.id, legalName: "Barbearia A", addressLine1: "Astraße 1", postalCode: "10115", city: "Berlin", updatedBy: "u-a" },
      }),
    );
    await runWithTenant(orgB.id, () =>
      db.tenantImpressum.create({
        data: { organizationId: orgB.id, legalName: "Barbearia B", addressLine1: "Bstraße 2", postalCode: "80331", city: "München", updatedBy: "u-b" },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.tenantImpressum.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.legalName === "Barbearia B")).toBe(false);

    await prisma.tenantImpressum.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  });
});

describe("Suite 1 — camada de serviço com contexto A vs recursos de B", () => {
  test("listLocations no contexto A não inclui filiais de B", async () => {
    const locations = await runWithTenant(orgA.id, () => listLocations());
    expect(locations.some((l) => l.id === locationB.id)).toBe(false);
    expect(locations.some((l) => l.id === locationA.id)).toBe(true);
  });

  test("getLocationById de B no contexto A retorna null", async () => {
    const found = await runWithTenant(orgA.id, () =>
      getLocationById(locationB.id),
    );
    expect(found).toBeNull();
  });

  test("createLocation grava sempre no tenant do contexto", async () => {
    const created = await runWithTenant(orgA.id, () =>
      createLocation({
        name: "Filial A2",
        addressLine1: "Cstraße 3",
        postalCode: "10117",
        city: "Berlin",
      }),
    );
    expect(created.organizationId).toBe(orgA.id);
  });
});
