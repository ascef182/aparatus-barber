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
let staffA: { id: string };
let staffB: { id: string };

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
  // Fixture compartilhada por StaffWorkingHours/StaffAbsence/StaffService/Booking
  // abaixo — todos exigem um staffId válido.
  staffA = await runWithTenant(orgA.id, () =>
    db.staff.create({
      data: { organizationId: orgA.id, locationId: locationA.id, displayName: "Barbeiro A" },
    }),
  );
  staffB = await runWithTenant(orgB.id, () =>
    db.staff.create({
      data: { organizationId: orgB.id, locationId: locationB.id, displayName: "Barbeiro B" },
    }),
  );
});

afterAll(async () => {
  // Modelos tenant-scoped agora vivem atrás de RLS (não só do extension
  // JS) -- o client `prisma` cru conecta como app_runtime, restrito por
  // política. Limpeza cross-tenant usa o bypass sancionado (platform
  // scope), igual a qualquer operação administrativa real do app.
  await runWithPlatformScope(async () => {
    // Ordem por dependência de FK: Booking referencia staff/service/customer/
    // coupon/location; StaffService/StaffWorkingHours/StaffAbsence referenciam
    // staff; Staff referencia location — cada um precisa sumir antes do que
    // referencia.
    await db.booking.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.staffService.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.staffWorkingHours.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.staffAbsence.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.staff.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    // Message/Conversation/CustomerCoupon referenciam Customer — precisam
    // sumir antes do deleteMany de customer logo abaixo.
    await db.message.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.conversation.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.customerCoupon.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.customer.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.closedPeriod.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    // tenantSettings é append-only por design, igual a auditLog (UPDATE/DELETE
    // revogados de app_runtime na migração de RLS) -- as linhas seedadas somem
    // com o container efêmero do Testcontainers ao final da suíte.
    await db.couponService.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.serviceImage.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.service.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.coupon.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    // auditLog é append-only por design (UPDATE/DELETE revogados de
    // app_runtime na migração de RLS) -- nem o app real apaga entradas de
    // auditoria, então o teste também não. As linhas seedadas somem com o
    // container efêmero do Testcontainers ao final da suíte.
    await db.tenantImpressum.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
    await db.location.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });
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
    const b = await runWithPlatformScope(() =>
      db.location.findUnique({ where: { id: locationB.id } }),
    );
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
    const all = await runWithPlatformScope(() =>
      db.location.findMany({ where: { organizationId: orgB.id } }),
    );
    expect(all.length).toBeGreaterThan(0);
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

    await runWithPlatformScope(() =>
      db.tenantImpressum.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
  });

  test("ServiceImage: fail-closed sem contexto, escopado sob tenant", async () => {
    const serviceA = await runWithTenant(orgA.id, () =>
      db.service.create({
        data: { organizationId: orgA.id, name: "Corte A", durationMinutes: 30, priceInCents: 2000 },
      }),
    );
    const serviceB = await runWithTenant(orgB.id, () =>
      db.service.create({
        data: { organizationId: orgB.id, name: "Corte B", durationMinutes: 30, priceInCents: 2000 },
      }),
    );

    await expect(
      db.serviceImage.create({
        data: { organizationId: orgA.id, serviceId: serviceA.id, url: "https://example.com/a.jpg" },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await runWithTenant(orgA.id, () =>
      db.serviceImage.create({
        data: { organizationId: orgA.id, serviceId: serviceA.id, url: "https://example.com/a.jpg" },
      }),
    );
    await runWithTenant(orgB.id, () =>
      db.serviceImage.create({
        data: { organizationId: orgB.id, serviceId: serviceB.id, url: "https://example.com/b.jpg" },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.serviceImage.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.url === "https://example.com/b.jpg")).toBe(false);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.serviceImage.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("CouponService: fail-closed sem contexto, escopado sob tenant", async () => {
    const serviceA = await runWithTenant(orgA.id, () =>
      db.service.findFirstOrThrow(),
    );
    const serviceB = await runWithTenant(orgB.id, () =>
      db.service.findFirstOrThrow(),
    );
    const couponA = await runWithTenant(orgA.id, () =>
      db.coupon.create({
        data: { organizationId: orgA.id, code: "ISOA", type: "PERCENT", value: 10 },
      }),
    );
    const couponB = await runWithTenant(orgB.id, () =>
      db.coupon.create({
        data: { organizationId: orgB.id, code: "ISOB", type: "PERCENT", value: 10 },
      }),
    );

    await expect(
      db.couponService.create({
        data: { organizationId: orgA.id, couponId: couponA.id, serviceId: serviceA.id },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await runWithTenant(orgA.id, () =>
      db.couponService.create({
        data: { organizationId: orgA.id, couponId: couponA.id, serviceId: serviceA.id },
      }),
    );
    await runWithTenant(orgB.id, () =>
      db.couponService.create({
        data: { organizationId: orgB.id, couponId: couponB.id, serviceId: serviceB.id },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.couponService.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.couponId === couponB.id)).toBe(false);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.couponService.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("QuoteRequest: fail-closed sem contexto, escopado sob tenant", async () => {
    await expect(
      db.quoteRequest.create({
        data: { organizationId: orgA.id, customerName: "x", message: "preciso de um orçamento" },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await runWithTenant(orgA.id, () =>
      db.quoteRequest.create({
        data: { organizationId: orgA.id, customerName: "Cliente A", customerEmail: "a@example.com", message: "orçamento A" },
      }),
    );
    await runWithTenant(orgB.id, () =>
      db.quoteRequest.create({
        data: { organizationId: orgB.id, customerName: "Cliente B", customerEmail: "b@example.com", message: "orçamento B" },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.quoteRequest.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.customerName === "Cliente B")).toBe(false);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.quoteRequest.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));

    await runWithPlatformScope(() =>
      db.quoteRequest.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
  });

  test("Staff: fail-closed sem contexto, escopado sob tenant, bloqueio de create cross-tenant", async () => {
    await expect(
      db.staff.create({
        data: { organizationId: orgA.id, locationId: locationA.id, displayName: "x" },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await expect(
      runWithTenant(orgA.id, () =>
        db.staff.create({
          data: { organizationId: orgB.id, locationId: locationA.id, displayName: "intruso" },
        }),
      ),
    ).rejects.toBeInstanceOf(CrossTenantWriteError);

    const seenByA = await runWithTenant(orgA.id, () => db.staff.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === staffA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === staffB.id)).toBe(false);

    const foundCrossTenant = await runWithTenant(orgA.id, () =>
      db.staff.findUnique({ where: { id: staffB.id } }),
    );
    expect(foundCrossTenant).toBeNull();

    const seenByPlatform = await runWithPlatformScope(() =>
      db.staff.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("StaffWorkingHours: fail-closed sem contexto, escopado sob tenant", async () => {
    await expect(
      db.staffWorkingHours.create({
        data: { organizationId: orgA.id, staffId: staffA.id, weekday: 1, startTime: "09:00", endTime: "18:00" },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await runWithTenant(orgA.id, () =>
      db.staffWorkingHours.create({
        data: { organizationId: orgA.id, staffId: staffA.id, weekday: 1, startTime: "09:00", endTime: "18:00" },
      }),
    );
    const whB = await runWithTenant(orgB.id, () =>
      db.staffWorkingHours.create({
        data: { organizationId: orgB.id, staffId: staffB.id, weekday: 1, startTime: "09:00", endTime: "18:00" },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.staffWorkingHours.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === whB.id)).toBe(false);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.staffWorkingHours.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("StaffAbsence: fail-closed sem contexto, escopado sob tenant", async () => {
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + 3600_000);

    await expect(
      db.staffAbsence.create({
        data: { organizationId: orgA.id, staffId: staffA.id, startAt, endAt },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await runWithTenant(orgA.id, () =>
      db.staffAbsence.create({
        data: { organizationId: orgA.id, staffId: staffA.id, startAt, endAt },
      }),
    );
    const absenceB = await runWithTenant(orgB.id, () =>
      db.staffAbsence.create({
        data: { organizationId: orgB.id, staffId: staffB.id, startAt, endAt },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.staffAbsence.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === absenceB.id)).toBe(false);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.staffAbsence.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("ClosedPeriod: fail-closed sem contexto, escopado sob tenant", async () => {
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + 3600_000);

    await expect(
      db.closedPeriod.create({
        data: { organizationId: orgA.id, name: "x", startAt, endAt },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await runWithTenant(orgA.id, () =>
      db.closedPeriod.create({
        data: { organizationId: orgA.id, name: "Feriado A", startAt, endAt },
      }),
    );
    const closedB = await runWithTenant(orgB.id, () =>
      db.closedPeriod.create({
        data: { organizationId: orgB.id, name: "Feriado B", startAt, endAt },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.closedPeriod.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === closedB.id)).toBe(false);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.closedPeriod.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("Service: fail-closed sem contexto, escopado sob tenant", async () => {
    await expect(
      db.service.create({
        data: { organizationId: orgA.id, name: "x", durationMinutes: 30, priceInCents: 1000 },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    const serviceA = await runWithTenant(orgA.id, () =>
      db.service.create({
        data: { organizationId: orgA.id, name: "Corte Isolamento A", durationMinutes: 30, priceInCents: 2000 },
      }),
    );
    const serviceB = await runWithTenant(orgB.id, () =>
      db.service.create({
        data: { organizationId: orgB.id, name: "Corte Isolamento B", durationMinutes: 30, priceInCents: 2000 },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.service.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === serviceA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === serviceB.id)).toBe(false);

    const foundCrossTenant = await runWithTenant(orgA.id, () =>
      db.service.findUnique({ where: { id: serviceB.id } }),
    );
    expect(foundCrossTenant).toBeNull();

    const seenByPlatform = await runWithPlatformScope(() =>
      db.service.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("StaffService: fail-closed sem contexto, escopado sob tenant", async () => {
    const serviceA = await runWithTenant(orgA.id, () =>
      db.service.create({
        data: { organizationId: orgA.id, name: "Serviço vínculo A", durationMinutes: 30, priceInCents: 1500 },
      }),
    );
    const serviceB = await runWithTenant(orgB.id, () =>
      db.service.create({
        data: { organizationId: orgB.id, name: "Serviço vínculo B", durationMinutes: 30, priceInCents: 1500 },
      }),
    );

    await expect(
      db.staffService.create({
        data: { organizationId: orgA.id, staffId: staffA.id, serviceId: serviceA.id },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await runWithTenant(orgA.id, () =>
      db.staffService.create({
        data: { organizationId: orgA.id, staffId: staffA.id, serviceId: serviceA.id },
      }),
    );
    await runWithTenant(orgB.id, () =>
      db.staffService.create({
        data: { organizationId: orgB.id, staffId: staffB.id, serviceId: serviceB.id },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.staffService.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.serviceId === serviceB.id)).toBe(false);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.staffService.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("Customer: fail-closed sem contexto, escopado sob tenant", async () => {
    await expect(
      db.customer.create({
        data: { organizationId: orgA.id, name: "x" },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    const customerA = await runWithTenant(orgA.id, () =>
      db.customer.create({ data: { organizationId: orgA.id, name: "Cliente Isolamento A" } }),
    );
    const customerB = await runWithTenant(orgB.id, () =>
      db.customer.create({ data: { organizationId: orgB.id, name: "Cliente Isolamento B" } }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.customer.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === customerA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === customerB.id)).toBe(false);

    const foundCrossTenant = await runWithTenant(orgA.id, () =>
      db.customer.findUnique({ where: { id: customerB.id } }),
    );
    expect(foundCrossTenant).toBeNull();

    const seenByPlatform = await runWithPlatformScope(() =>
      db.customer.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("Coupon: fail-closed sem contexto, escopado sob tenant", async () => {
    await expect(
      db.coupon.create({
        data: { organizationId: orgA.id, code: "ISOX", type: "PERCENT", value: 10 },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    const couponA = await runWithTenant(orgA.id, () =>
      db.coupon.create({ data: { organizationId: orgA.id, code: "ISOA2", type: "PERCENT", value: 10 } }),
    );
    const couponB = await runWithTenant(orgB.id, () =>
      db.coupon.create({ data: { organizationId: orgB.id, code: "ISOB2", type: "PERCENT", value: 10 } }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.coupon.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === couponA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === couponB.id)).toBe(false);

    const foundCrossTenant = await runWithTenant(orgA.id, () =>
      db.coupon.findUnique({ where: { id: couponB.id } }),
    );
    expect(foundCrossTenant).toBeNull();

    const seenByPlatform = await runWithPlatformScope(() =>
      db.coupon.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("TenantSettings: fail-closed sem contexto, escopado sob tenant", async () => {
    await expect(
      db.tenantSettings.create({
        data: { organizationId: orgA.id, version: 1, data: {}, createdBy: "u" },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    await runWithTenant(orgA.id, () =>
      db.tenantSettings.create({
        data: { organizationId: orgA.id, version: 1, data: {}, createdBy: "u-a" },
      }),
    );
    const settingsB = await runWithTenant(orgB.id, () =>
      db.tenantSettings.create({
        data: { organizationId: orgB.id, version: 1, data: {}, createdBy: "u-b" },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.tenantSettings.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === settingsB.id)).toBe(false);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.tenantSettings.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("Booking: fail-closed sem contexto, escopado sob tenant, update cross-tenant falha", async () => {
    const serviceA = await runWithTenant(orgA.id, () =>
      db.service.create({
        data: { organizationId: orgA.id, name: "Serviço booking A", durationMinutes: 30, priceInCents: 3000 },
      }),
    );
    const serviceB = await runWithTenant(orgB.id, () =>
      db.service.create({
        data: { organizationId: orgB.id, name: "Serviço booking B", durationMinutes: 30, priceInCents: 3000 },
      }),
    );
    const customerA = await runWithTenant(orgA.id, () =>
      db.customer.create({ data: { organizationId: orgA.id, name: "Cliente booking A" } }),
    );
    const customerB = await runWithTenant(orgB.id, () =>
      db.customer.create({ data: { organizationId: orgB.id, name: "Cliente booking B" } }),
    );

    const startAt = new Date(Date.now() + 86400_000);
    const endAt = new Date(startAt.getTime() + 30 * 60_000);
    const bookingData = (
      organizationId: string,
      locationId: string,
      staffId: string,
      serviceId: string,
      customerId: string,
    ) => ({
      organizationId,
      locationId,
      staffId,
      serviceId,
      customerId,
      startAt,
      endAt,
      status: "CONFIRMED" as const,
      priceInCents: 3000,
    });

    await expect(
      db.booking.create({
        data: bookingData(orgA.id, locationA.id, staffA.id, serviceA.id, customerA.id),
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    const bookingA = await runWithTenant(orgA.id, () =>
      db.booking.create({
        data: bookingData(orgA.id, locationA.id, staffA.id, serviceA.id, customerA.id),
      }),
    );
    const bookingB = await runWithTenant(orgB.id, () =>
      db.booking.create({
        data: bookingData(orgB.id, locationB.id, staffB.id, serviceB.id, customerB.id),
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.booking.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === bookingA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === bookingB.id)).toBe(false);

    const foundCrossTenant = await runWithTenant(orgA.id, () =>
      db.booking.findUnique({ where: { id: bookingB.id } }),
    );
    expect(foundCrossTenant).toBeNull();

    await expect(
      runWithTenant(orgA.id, () =>
        db.booking.update({ where: { id: bookingB.id }, data: { status: "CANCELLED" } }),
      ),
    ).rejects.toThrow();

    const seenByPlatform = await runWithPlatformScope(() =>
      db.booking.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("Conversation: fail-closed sem contexto, escopado sob tenant", async () => {
    const customerA = await runWithTenant(orgA.id, () =>
      db.customer.create({ data: { organizationId: orgA.id, name: "Cliente Conversa A" } }),
    );
    const customerB = await runWithTenant(orgB.id, () =>
      db.customer.create({ data: { organizationId: orgB.id, name: "Cliente Conversa B" } }),
    );

    await expect(
      db.conversation.create({
        data: { organizationId: orgA.id, customerId: customerA.id },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    const conversationA = await runWithTenant(orgA.id, () =>
      db.conversation.create({ data: { organizationId: orgA.id, customerId: customerA.id } }),
    );
    const conversationB = await runWithTenant(orgB.id, () =>
      db.conversation.create({ data: { organizationId: orgB.id, customerId: customerB.id } }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.conversation.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === conversationA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === conversationB.id)).toBe(false);

    const foundCrossTenant = await runWithTenant(orgA.id, () =>
      db.conversation.findUnique({ where: { id: conversationB.id } }),
    );
    expect(foundCrossTenant).toBeNull();

    await expect(
      runWithTenant(orgA.id, () =>
        db.conversation.create({
          data: { organizationId: orgB.id, customerId: customerB.id },
        }),
      ),
    ).rejects.toBeInstanceOf(CrossTenantWriteError);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.conversation.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("Message: fail-closed sem contexto, escopado sob tenant (mesmo via conversationId de outro tenant)", async () => {
    const customerA = await runWithTenant(orgA.id, () =>
      db.customer.create({ data: { organizationId: orgA.id, name: "Cliente Mensagem A" } }),
    );
    const customerB = await runWithTenant(orgB.id, () =>
      db.customer.create({ data: { organizationId: orgB.id, name: "Cliente Mensagem B" } }),
    );
    const conversationA = await runWithTenant(orgA.id, () =>
      db.conversation.create({ data: { organizationId: orgA.id, customerId: customerA.id } }),
    );
    const conversationB = await runWithTenant(orgB.id, () =>
      db.conversation.create({ data: { organizationId: orgB.id, customerId: customerB.id } }),
    );

    await expect(
      db.message.create({
        data: {
          organizationId: orgA.id,
          conversationId: conversationA.id,
          senderType: "CUSTOMER",
          senderUserId: "user-a",
          body: "oi",
        },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    const messageA = await runWithTenant(orgA.id, () =>
      db.message.create({
        data: {
          organizationId: orgA.id,
          conversationId: conversationA.id,
          senderType: "CUSTOMER",
          senderUserId: "user-a",
          body: "mensagem A",
        },
      }),
    );
    const messageB = await runWithTenant(orgB.id, () =>
      db.message.create({
        data: {
          organizationId: orgB.id,
          conversationId: conversationB.id,
          senderType: "CUSTOMER",
          senderUserId: "user-b",
          body: "mensagem B",
        },
      }),
    );

    // Mesmo pedindo explicitamente pelo conversationId de B, o contexto A
    // nunca vê a mensagem — é exatamente o cenário que a denormalização de
    // organizationId em Message protege (join através do parent não é
    // usado pela extension, só a coluna própria do model).
    const seenByAFilteredByConversationB = await runWithTenant(orgA.id, () =>
      db.message.findMany({ where: { conversationId: conversationB.id } }),
    );
    expect(seenByAFilteredByConversationB).toHaveLength(0);

    const seenByA = await runWithTenant(orgA.id, () => db.message.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === messageA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === messageB.id)).toBe(false);

    await expect(
      runWithTenant(orgA.id, () =>
        db.message.create({
          data: {
            organizationId: orgB.id,
            conversationId: conversationB.id,
            senderType: "STAFF",
            senderUserId: "user-a",
            body: "intruso",
          },
        }),
      ),
    ).rejects.toBeInstanceOf(CrossTenantWriteError);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.message.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
  });

  test("CustomerCoupon: fail-closed sem contexto, escopado sob tenant, claim não vaza cross-tenant", async () => {
    const customerA = await runWithTenant(orgA.id, () =>
      db.customer.create({ data: { organizationId: orgA.id, name: "Cliente Cupom A" } }),
    );
    const customerB = await runWithTenant(orgB.id, () =>
      db.customer.create({ data: { organizationId: orgB.id, name: "Cliente Cupom B" } }),
    );
    const couponA = await runWithTenant(orgA.id, () =>
      db.coupon.create({ data: { organizationId: orgA.id, code: "WALLETA", type: "PERCENT", value: 10 } }),
    );
    const couponB = await runWithTenant(orgB.id, () =>
      db.coupon.create({ data: { organizationId: orgB.id, code: "WALLETB", type: "PERCENT", value: 10 } }),
    );

    await expect(
      db.customerCoupon.create({
        data: { organizationId: orgA.id, customerId: customerA.id, couponId: couponA.id },
      }),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    const claimA = await runWithTenant(orgA.id, () =>
      db.customerCoupon.create({
        data: { organizationId: orgA.id, customerId: customerA.id, couponId: couponA.id },
      }),
    );
    const claimB = await runWithTenant(orgB.id, () =>
      db.customerCoupon.create({
        data: { organizationId: orgB.id, customerId: customerB.id, couponId: couponB.id },
      }),
    );

    const seenByA = await runWithTenant(orgA.id, () => db.customerCoupon.findMany());
    expect(seenByA.every((entry) => entry.organizationId === orgA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === claimA.id)).toBe(true);
    expect(seenByA.some((entry) => entry.id === claimB.id)).toBe(false);

    await expect(
      runWithTenant(orgA.id, () =>
        db.customerCoupon.create({
          data: { organizationId: orgB.id, customerId: customerB.id, couponId: couponB.id },
        }),
      ),
    ).rejects.toBeInstanceOf(CrossTenantWriteError);

    const seenByPlatform = await runWithPlatformScope(() =>
      db.customerCoupon.findMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } }),
    );
    const orgIds = new Set(seenByPlatform.map((entry) => entry.organizationId));
    expect(orgIds).toEqual(new Set([orgA.id, orgB.id]));
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
