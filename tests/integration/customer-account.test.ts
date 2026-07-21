import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithPlatformScope, runWithTenant } from "@/lib/tenant-context";
import { findOrCreateCustomerForUser } from "@/lib/services/customer-service";
import { getMembership } from "@/lib/services/member-service";
import { createBooking, listBookingsForCustomer } from "@/lib/services/booking-service";

/**
 * Cobre a área de conta do cliente final (app/t/[slug]/account): o Customer
 * ligado à sessão via customerActionClient (lib/safe-action.ts) é sempre
 * resolvido por findOrCreateCustomerForUser — nunca por input do cliente —
 * então testamos a mesma dupla de garantias que esse client depende: (1)
 * isolamento por tenant/cliente das reservas listadas, (2) sessão de
 * cliente não confere nenhuma permissão de staff (Customer != Member).
 */

const orgA = { id: randomUUID(), slug: `acct-a-${randomUUID().slice(0, 8)}` };
const orgB = { id: randomUUID(), slug: `acct-b-${randomUUID().slice(0, 8)}` };
const userId = randomUUID();
const otherUserId = randomUUID();
let staffAId: string;
let serviceAId: string;

beforeAll(async () => {
  await prisma.organization.createMany({
    data: [
      { id: orgA.id, name: "Org A", slug: orgA.slug },
      { id: orgB.id, name: "Org B", slug: orgB.slug },
    ],
  });
  await prisma.user.createMany({
    data: [
      { id: userId, name: "Cliente", email: `cliente-${userId}@example.com` },
      { id: otherUserId, name: "Outro Cliente", email: `outro-${otherUserId}@example.com` },
    ],
  });
  await runWithPlatformScope(async () => {
    const location = await db.location.create({
      data: { organizationId: orgA.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
    });
    const staff = await db.staff.create({ data: { organizationId: orgA.id, locationId: location.id, displayName: "Ana" } });
    staffAId = staff.id;
    const service = await db.service.create({
      data: { organizationId: orgA.id, name: "Corte", durationMinutes: 30, priceInCents: 3000, paymentMode: "ON_SITE" },
    });
    serviceAId = service.id;
    await db.staffService.create({ data: { organizationId: orgA.id, staffId: staffAId, serviceId: serviceAId } });
    await db.staffWorkingHours.create({ data: { organizationId: orgA.id, staffId: staffAId, weekday: 1, startTime: "00:00", endTime: "23:59" } });
  });
});

afterAll(async () => {
  await runWithPlatformScope(async () => {
    await db.booking.deleteMany({ where: { organizationId: orgA.id } });
    await db.customer.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await db.staffService.deleteMany({ where: { organizationId: orgA.id } });
    await db.staffWorkingHours.deleteMany({ where: { organizationId: orgA.id } });
    await db.service.deleteMany({ where: { organizationId: orgA.id } });
    await db.staff.deleteMany({ where: { organizationId: orgA.id } });
    await db.location.deleteMany({ where: { organizationId: orgA.id } });
  });
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  await prisma.$disconnect();
});

const MONDAY = "2026-08-17";
function at(hour: number) {
  return new Date(`${MONDAY}T${String(hour).padStart(2, "0")}:00:00.000Z`);
}

describe("conta do cliente final", () => {
  test("findOrCreateCustomerForUser é por tenant: o mesmo userId gera Customer distinto em cada org", async () => {
    const customerInA = await runWithTenant(orgA.id, () =>
      findOrCreateCustomerForUser({ id: userId, name: "Cliente", email: `cliente-${userId}@example.com` }),
    );
    const customerInB = await runWithTenant(orgB.id, () =>
      findOrCreateCustomerForUser({ id: userId, name: "Cliente", email: `cliente-${userId}@example.com` }),
    );
    expect(customerInA.id).not.toBe(customerInB.id);
    expect(customerInA.organizationId).toBe(orgA.id);
    expect(customerInB.organizationId).toBe(orgB.id);
  });

  test("chamar de novo pro mesmo (org, userId) retorna o mesmo Customer, sem duplicar", async () => {
    const first = await runWithTenant(orgA.id, () =>
      findOrCreateCustomerForUser({ id: userId, name: "Cliente", email: `cliente-${userId}@example.com` }),
    );
    const second = await runWithTenant(orgA.id, () =>
      findOrCreateCustomerForUser({ id: userId, name: "Cliente", email: `cliente-${userId}@example.com` }),
    );
    expect(second.id).toBe(first.id);
  });

  test("listBookingsForCustomer só retorna reservas do próprio cliente, não de outro cliente do mesmo tenant", async () => {
    const customer = await runWithTenant(orgA.id, () =>
      findOrCreateCustomerForUser({ id: userId, name: "Cliente", email: `cliente-${userId}@example.com` }),
    );
    const otherCustomer = await runWithTenant(orgA.id, () =>
      findOrCreateCustomerForUser({ id: otherUserId, name: "Outro Cliente", email: `outro-${otherUserId}@example.com` }),
    );

    await runWithTenant(orgA.id, () =>
      createBooking({
        serviceId: serviceAId,
        staffId: staffAId,
        startAt: at(9),
        customerUser: { id: userId, name: "Cliente", email: `cliente-${userId}@example.com` },
      }),
    );
    await runWithTenant(orgA.id, () =>
      createBooking({
        serviceId: serviceAId,
        staffId: staffAId,
        startAt: at(10),
        customerUser: { id: otherUserId, name: "Outro Cliente", email: `outro-${otherUserId}@example.com` },
      }),
    );

    const myBookings = await runWithTenant(orgA.id, () => listBookingsForCustomer(customer.id));
    const otherBookings = await runWithTenant(orgA.id, () => listBookingsForCustomer(otherCustomer.id));

    expect(myBookings).toHaveLength(1);
    expect(myBookings[0]!.customerId).toBe(customer.id);
    expect(otherBookings).toHaveLength(1);
    expect(otherBookings[0]!.customerId).toBe(otherCustomer.id);
  });

  test("sessão de cliente final não confere nenhuma permissão de staff (Customer != Member)", async () => {
    await runWithTenant(orgA.id, () =>
      findOrCreateCustomerForUser({ id: userId, name: "Cliente", email: `cliente-${userId}@example.com` }),
    );
    const membership = await getMembership(orgA.id, userId);
    expect(membership).toBeNull();
  });
});
