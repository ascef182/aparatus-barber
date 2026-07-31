import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithPlatformScope, runWithTenant } from "@/lib/tenant-context";
import { getCustomerStats, listCustomers } from "@/lib/services/customer-service";

/**
 * getCustomerStats (total gasto/última visita/próximo horário) e o filtro
 * de status de listCustomers — usados pela tabela de clientes
 * (dashboard/customers), sem cobertura própria até agora.
 */

const org = { id: randomUUID(), slug: `custstats-${randomUUID().slice(0, 8)}` };
let locationId: string;
let staffId: string;
let serviceId: string;
let customerA: string; // gastou em 2 reservas concluídas, sem próximo horário
let customerB: string; // reembolso parcial, tem próximo horário confirmado
let customerC: string; // bloqueado, sem nenhuma reserva

beforeAll(async () => {
  await prisma.organization.create({ data: { id: org.id, name: "Cust Stats Org", slug: org.slug } });
  await runWithPlatformScope(async () => {
    const location = await db.location.create({
      data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
    });
    locationId = location.id;
    const staff = await db.staff.create({ data: { organizationId: org.id, locationId, displayName: "Ana" } });
    staffId = staff.id;
    const service = await db.service.create({
      data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceInCents: 3000, currency: "EUR" },
    });
    serviceId = service.id;

    customerA = (await db.customer.create({ data: { organizationId: org.id, name: "Cliente A" } })).id;
    customerB = (await db.customer.create({ data: { organizationId: org.id, name: "Cliente B" } })).id;
    customerC = (await db.customer.create({ data: { organizationId: org.id, name: "Cliente C", isBlocked: true } })).id;

    const past = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000);
    const future = (daysAhead: number) => new Date(Date.now() + daysAhead * 86_400_000);

    // A: duas reservas concluídas -> soma 3000+2000=5000, última visita = a mais recente das duas (5 dias atrás).
    await db.booking.create({
      data: {
        organizationId: org.id, locationId, staffId, serviceId, customerId: customerA,
        startAt: past(10), endAt: past(10), status: "COMPLETED", priceInCents: 3000, paymentReceivedInCents: 3000, paymentMode: "ON_SITE", paymentStatus: "PAID",
      },
    });
    await db.booking.create({
      data: {
        organizationId: org.id, locationId, staffId, serviceId, customerId: customerA,
        startAt: past(5), endAt: past(5), status: "COMPLETED", priceInCents: 2000, paymentReceivedInCents: 2000, paymentMode: "ON_SITE", paymentStatus: "PAID",
      },
    });

    // B: reembolso parcial (pagou 4000, devolveu 1000 -> gasto líquido 3000) e uma reserva futura confirmada.
    await db.booking.create({
      data: {
        organizationId: org.id, locationId, staffId, serviceId, customerId: customerB,
        startAt: past(3), endAt: past(3), status: "COMPLETED", priceInCents: 4000, paymentReceivedInCents: 4000, refundedAmountInCents: 1000, paymentMode: "ON_SITE", paymentStatus: "PAID",
      },
    });
    await db.booking.create({
      data: {
        organizationId: org.id, locationId, staffId, serviceId, customerId: customerB,
        startAt: future(7), endAt: future(7), status: "CONFIRMED", priceInCents: 3000, paymentMode: "ON_SITE",
      },
    });
  });
});

afterAll(async () => {
  await runWithPlatformScope(async () => {
    await db.booking.deleteMany({ where: { organizationId: org.id } });
    await db.customer.deleteMany({ where: { organizationId: org.id } });
    await db.staff.deleteMany({ where: { organizationId: org.id } });
    await db.location.deleteMany({ where: { organizationId: org.id } });
  });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("getCustomerStats", () => {
  test("soma gasto líquido (pagamento - reembolso) e pega a última visita entre as reservas concluídas", async () => {
    const stats = await runWithTenant(org.id, () => getCustomerStats([customerA, customerB, customerC]));
    expect(stats.get(customerA)!.totalSpentInCents).toBe(5000);
    expect(stats.get(customerA)!.lastVisitAt).not.toBeNull();
    expect(stats.get(customerA)!.nextAppointmentAt).toBeNull();

    expect(stats.get(customerB)!.totalSpentInCents).toBe(3000);
    expect(stats.get(customerB)!.nextAppointmentAt).not.toBeNull();
  });

  test("cliente sem nenhuma reserva vem com zeros/nulls, não quebra nem some do mapa", async () => {
    const stats = await runWithTenant(org.id, () => getCustomerStats([customerC]));
    expect(stats.get(customerC)).toEqual({ totalSpentInCents: 0, lastVisitAt: null, nextAppointmentAt: null });
  });
});

describe("listCustomers — filtro de status", () => {
  test("all/active/blocked retornam os conjuntos certos", async () => {
    const all = await runWithTenant(org.id, () => listCustomers(undefined, "all"));
    const active = await runWithTenant(org.id, () => listCustomers(undefined, "active"));
    const blocked = await runWithTenant(org.id, () => listCustomers(undefined, "blocked"));

    expect(all.map((c) => c.id).sort()).toEqual([customerA, customerB, customerC].sort());
    expect(active.some((c) => c.id === customerC)).toBe(false);
    expect(blocked.map((c) => c.id)).toEqual([customerC]);
  });
});
