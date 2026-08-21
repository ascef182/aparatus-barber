import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithPlatformScope, runWithTenant } from "@/lib/tenant-context";
import {
  cancelBookingForCustomer,
} from "@/lib/services/booking-service";
import { updateCustomerProfile } from "@/lib/services/customer-service";

/**
 * IDOR dentro do MESMO tenant: dois donos independentes (customerA/customerB)
 * na mesma organização, um tentando agir sobre o recurso do outro. Diferente
 * de tests/tenant-isolation.test.ts (que prova isolamento ENTRE tenants),
 * aqui o tenant é o mesmo — só a checagem de posse em
 * cancelBookingForCustomer/updateCustomerProfile pode impedir o acesso.
 */

const org = { id: randomUUID(), slug: `idor-${randomUUID().slice(0, 8)}` };
const userAId = randomUUID();
const userBId = randomUUID();
let locationId: string;
let staffId: string;
let serviceId: string;
let customerA: { id: string };
let customerB: { id: string };
let bookingA: { id: string };

beforeAll(async () => {
  await prisma.organization.create({
    data: { id: org.id, name: "IDOR Org", slug: org.slug },
  });
  await prisma.user.createMany({
    data: [
      { id: userAId, name: "User A", email: `usera-${userAId}@example.com` },
      { id: userBId, name: "User B", email: `userb-${userBId}@example.com` },
    ],
  });

  const location = await runWithTenant(org.id, () =>
    db.location.create({
      data: {
        organizationId: org.id,
        name: "Filial IDOR",
        addressLine1: "Rua Y",
        postalCode: "00000",
        city: "Cidade",
      },
    }),
  );
  locationId = location.id;

  const staff = await runWithTenant(org.id, () =>
    db.staff.create({
      data: { organizationId: org.id, locationId, displayName: "Barbeiro" },
    }),
  );
  staffId = staff.id;

  const service = await runWithTenant(org.id, () =>
    db.service.create({
      data: {
        organizationId: org.id,
        name: "Corte",
        durationMinutes: 30,
        priceInCents: 3000,
      },
    }),
  );
  serviceId = service.id;

  customerA = await runWithTenant(org.id, () =>
    db.customer.create({
      data: { organizationId: org.id, userId: userAId, name: "Cliente A" },
    }),
  );
  customerB = await runWithTenant(org.id, () =>
    db.customer.create({
      data: { organizationId: org.id, userId: userBId, name: "Cliente B" },
    }),
  );

  const startAt = new Date(Date.now() + 7 * 86_400_000);
  bookingA = await runWithTenant(org.id, () =>
    db.booking.create({
      data: {
        organizationId: org.id,
        locationId,
        staffId,
        serviceId,
        customerId: customerA.id,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60_000),
        status: "CONFIRMED",
        priceInCents: 3000,
      },
    }),
  );
});

afterAll(async () => {
  await runWithPlatformScope(async () => {
    await db.booking.deleteMany({ where: { organizationId: org.id } });
    await db.customer.deleteMany({ where: { organizationId: org.id } });
    await db.service.deleteMany({ where: { organizationId: org.id } });
    await db.staff.deleteMany({ where: { organizationId: org.id } });
    await db.location.deleteMany({ where: { organizationId: org.id } });
  });
  await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("Booking: cliente B não pode cancelar reserva do cliente A (mesmo tenant)", () => {
  test("cancelBookingForCustomer rejeita quando expectedCustomerId não é o dono", async () => {
    await runWithTenant(org.id, async () => {
      await expect(
        cancelBookingForCustomer(bookingA.id, customerB.id, userBId),
      ).rejects.toThrow("Reserva não encontrada.");
      const stillConfirmed = await db.booking.findUnique({
        where: { id: bookingA.id },
      });
      expect(stillConfirmed?.status).toBe("CONFIRMED");
    });
  });

  test("cancelBookingForCustomer permite quando expectedCustomerId é o dono", async () => {
    await runWithTenant(org.id, async () => {
      const cancelled = await cancelBookingForCustomer(
        bookingA.id,
        customerA.id,
        userAId,
      );
      expect(cancelled.status).toBe("CANCELLED");
    });
  });
});

describe("Customer: cliente B não pode editar o perfil do cliente A (mesmo tenant)", () => {
  test("updateCustomerProfile rejeita quando expectedUserId não é o dono", async () => {
    await runWithTenant(org.id, async () => {
      await expect(
        updateCustomerProfile(customerA.id, userBId, { name: "hacked" }),
      ).rejects.toThrow("Cliente não encontrado.");
      const unchanged = await db.customer.findUnique({
        where: { id: customerA.id },
      });
      expect(unchanged?.name).toBe("Cliente A");
    });
  });

  test("updateCustomerProfile permite quando expectedUserId é o dono", async () => {
    await runWithTenant(org.id, async () => {
      const updated = await updateCustomerProfile(customerA.id, userAId, {
        name: "Novo Nome",
      });
      expect(updated.name).toBe("Novo Nome");
    });
  });
});
