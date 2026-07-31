import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithPlatformScope, runWithTenant } from "@/lib/tenant-context";
import { getDashboardMetrics } from "@/lib/services/dashboard-metrics-service";
import { formatDateInTenantTz, tenantTimeToUtc } from "@/lib/dates";

/**
 * Cobertura das métricas novas (ticket médio, novos clientes, ocupação,
 * variação vs. período anterior) — a lógica de ocupação em particular
 * cruza StaffWorkingHours/StaffAbsence/Booking manualmente (não reaproveita
 * lib/scheduling/availability.ts, que é por slot de serviço), então merece
 * teste próprio.
 */

const TZ = "Europe/Berlin";
const org = { id: randomUUID(), slug: `metrics-${randomUUID().slice(0, 8)}` };
let locationId: string;
let staffId: string;
let serviceId: string;

const today = formatDateInTenantTz(new Date(), TZ);
const yesterday = formatDateInTenantTz(new Date(Date.now() - 86_400_000), TZ);

beforeAll(async () => {
  await prisma.organization.create({ data: { id: org.id, name: "Metrics Org", slug: org.slug, timezone: TZ } });
  await runWithPlatformScope(async () => {
    const location = await db.location.create({
      data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
    });
    locationId = location.id;
    const staff = await db.staff.create({ data: { organizationId: org.id, locationId, displayName: "Ana" } });
    staffId = staff.id;
    // Todos os dias da semana abertos 09:00-18:00 (540min) — evita depender
    // de qual dia da semana o teste roda (hoje/ontem podem cair em
    // qualquer combinação).
    await db.staffWorkingHours.createMany({
      data: Array.from({ length: 7 }, (_, weekday) => ({
        organizationId: org.id, staffId, weekday, startTime: "09:00", endTime: "18:00",
      })),
    });
    const service = await db.service.create({
      data: { organizationId: org.id, name: "Corte", durationMinutes: 60, priceInCents: 6000, currency: "EUR" },
    });
    serviceId = service.id;

    const customerYesterday = await db.customer.create({ data: { organizationId: org.id, name: "Cliente Ontem" } });
    const customerToday = await db.customer.create({ data: { organizationId: org.id, name: "Cliente Hoje" } });

    // Ontem: 1 reserva concluída de 90min, ticket 4000 cents.
    await db.booking.create({
      data: {
        organizationId: org.id, locationId, staffId, serviceId, customerId: customerYesterday.id,
        startAt: tenantTimeToUtc(yesterday, "09:00", TZ), endAt: tenantTimeToUtc(yesterday, "10:30", TZ),
        status: "COMPLETED", priceInCents: 4000, paymentReceivedInCents: 4000, paymentMode: "ON_SITE", paymentStatus: "PAID",
      },
    });
    // Hoje: 1 reserva concluída de 60min, ticket 6000 cents.
    await db.booking.create({
      data: {
        organizationId: org.id, locationId, staffId, serviceId, customerId: customerToday.id,
        startAt: tenantTimeToUtc(today, "09:00", TZ), endAt: tenantTimeToUtc(today, "10:00", TZ),
        status: "COMPLETED", priceInCents: 6000, paymentReceivedInCents: 6000, paymentMode: "ON_SITE", paymentStatus: "PAID",
      },
    });
  });
});

afterAll(async () => {
  await runWithPlatformScope(async () => {
    await db.booking.deleteMany({ where: { organizationId: org.id } });
    await db.customer.deleteMany({ where: { organizationId: org.id } });
    await db.staffService.deleteMany({ where: { organizationId: org.id } });
    await db.staffWorkingHours.deleteMany({ where: { organizationId: org.id } });
    await db.staff.deleteMany({ where: { organizationId: org.id } });
    await db.location.deleteMany({ where: { organizationId: org.id } });
  });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("getDashboardMetrics — range=1 (hoje) vs. ontem", () => {
  test("ticket médio, novos clientes e receita batem com o que foi seedado hoje", async () => {
    const metrics = await runWithTenant(org.id, () => getDashboardMetrics(TZ, 1));
    expect(metrics.receivedRevenue).toBe(6000);
    expect(metrics.completedCount).toBe(1);
    expect(metrics.avgTicketInCents).toBe(6000);
    expect(metrics.newCustomersCount).toBeGreaterThanOrEqual(1);
  });

  test("variação vs. ontem é calculada corretamente (receita e ticket médio +50%)", async () => {
    const metrics = await runWithTenant(org.id, () => getDashboardMetrics(TZ, 1));
    expect(metrics.trends.receivedRevenue).toBeCloseTo(0.5, 5);
    expect(metrics.trends.avgTicketInCents).toBeCloseTo(0.5, 5);
  });

  test("ocupação: 60min reservadas de 540min disponíveis (1 profissional, 09:00-18:00)", async () => {
    const metrics = await runWithTenant(org.id, () => getDashboardMetrics(TZ, 1));
    expect(metrics.occupancyRate).not.toBeNull();
    expect(metrics.occupancyRate!).toBeCloseTo(60 / 540, 5);
  });
});

describe("getDashboardMetrics — variação com base zero", () => {
  test("trend vem null (não -100% nem Infinity) quando o período anterior não teve nada", async () => {
    const emptyOrg = { id: randomUUID(), slug: `metrics-empty-${randomUUID().slice(0, 8)}` };
    await prisma.organization.create({ data: { id: emptyOrg.id, name: "Empty Org", slug: emptyOrg.slug, timezone: TZ } });
    await runWithPlatformScope(async () => {
      const location = await db.location.create({
        data: { organizationId: emptyOrg.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
      });
      const staff = await db.staff.create({ data: { organizationId: emptyOrg.id, locationId: location.id, displayName: "Bea" } });
      const service = await db.service.create({
        data: { organizationId: emptyOrg.id, name: "Corte", durationMinutes: 30, priceInCents: 3000, currency: "EUR" },
      });
      const customer = await db.customer.create({ data: { organizationId: emptyOrg.id, name: "Cliente" } });
      await db.booking.create({
        data: {
          organizationId: emptyOrg.id, locationId: location.id, staffId: staff.id, serviceId: service.id, customerId: customer.id,
          startAt: tenantTimeToUtc(today, "09:00", TZ), endAt: tenantTimeToUtc(today, "09:30", TZ),
          status: "COMPLETED", priceInCents: 3000, paymentReceivedInCents: 3000, paymentMode: "ON_SITE", paymentStatus: "PAID",
        },
      });
    });

    const metrics = await runWithTenant(emptyOrg.id, () => getDashboardMetrics(TZ, 1));
    expect(metrics.trends.receivedRevenue).toBeNull();
    expect(metrics.trends.bookingCount).toBeNull();

    await runWithPlatformScope(async () => {
      await db.booking.deleteMany({ where: { organizationId: emptyOrg.id } });
      await db.customer.deleteMany({ where: { organizationId: emptyOrg.id } });
      await db.staff.deleteMany({ where: { organizationId: emptyOrg.id } });
      await db.location.deleteMany({ where: { organizationId: emptyOrg.id } });
    });
    await prisma.organization.delete({ where: { id: emptyOrg.id } });
  });
});
