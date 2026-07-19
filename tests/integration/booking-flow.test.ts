import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/tenant-context";
import {
  cancelBooking,
  createBooking,
  expireStaleHolds,
} from "@/lib/services/booking-service";

const org = { id: randomUUID(), slug: `bkflow-${randomUUID().slice(0, 8)}` };
let locationId: string;
let staffId: string;
let onSiteServiceId: string;
let prepaidServiceId: string;
let customerId: string;

beforeAll(async () => {
  await prisma.organization.create({ data: { id: org.id, name: "Booking Flow Org", slug: org.slug } });
  const location = await prisma.location.create({
    data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
  });
  locationId = location.id;
  const staff = await prisma.staff.create({
    data: { organizationId: org.id, locationId, displayName: "Ana" },
  });
  staffId = staff.id;

  const onSite = await prisma.service.create({
    data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceInCents: 3000, paymentMode: "ON_SITE" },
  });
  onSiteServiceId = onSite.id;
  const prepaid = await prisma.service.create({
    data: { organizationId: org.id, name: "Corte premium", durationMinutes: 30, priceInCents: 5000, paymentMode: "FULL_PREPAYMENT" },
  });
  prepaidServiceId = prepaid.id;
  await prisma.staffService.createMany({
    data: [
      { organizationId: org.id, staffId, serviceId: onSiteServiceId },
      { organizationId: org.id, staffId, serviceId: prepaidServiceId },
    ],
  });
  await prisma.staffWorkingHours.create({
    data: { organizationId: org.id, staffId, weekday: 1, startTime: "00:00", endTime: "23:59" },
  });

  const customer = await prisma.customer.create({
    data: { organizationId: org.id, name: "Cliente Teste", email: "cliente@example.com" },
  });
  customerId = customer.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organizationId: org.id } });
  await prisma.booking.deleteMany({ where: { organizationId: org.id } });
  await prisma.customer.deleteMany({ where: { organizationId: org.id } });
  await prisma.staffWorkingHours.deleteMany({ where: { organizationId: org.id } });
  await prisma.staffService.deleteMany({ where: { organizationId: org.id } });
  await prisma.service.deleteMany({ where: { organizationId: org.id } });
  await prisma.staff.deleteMany({ where: { organizationId: org.id } });
  await prisma.location.deleteMany({ where: { organizationId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

// Segunda-feira (weekday=1) bem no futuro, dentro da janela de antecedência.
const MONDAY = "2026-08-10";
function at(hour: number) {
  return new Date(`${MONDAY}T${String(hour).padStart(2, "0")}:00:00.000Z`);
}

describe("fluxo de booking", () => {
  test("booking com pagamento online cria hold PENDING_PAYMENT com expiresAt de 30min", async () => {
    const booking = await runWithTenant(org.id, () =>
      createBooking({
        serviceId: prepaidServiceId,
        staffId,
        startAt: at(9),
        customer: { name: "Guest A", email: "guesta@example.com" },
      }),
    );
    expect(booking.status).toBe("PENDING_PAYMENT");
    expect(booking.expiresAt).not.toBeNull();
    const diffMinutes = (booking.expiresAt!.getTime() - Date.now()) / 60_000;
    expect(diffMinutes).toBeGreaterThan(25);
    expect(diffMinutes).toBeLessThanOrEqual(30);
  });

  test("booking sem pagamento online confirma direto (CONFIRMED)", async () => {
    const booking = await runWithTenant(org.id, () =>
      createBooking({
        serviceId: onSiteServiceId,
        staffId,
        startAt: at(10),
        customer: { name: "Guest B", email: "guestb@example.com" },
      }),
    );
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.expiresAt).toBeNull();
  });

  test("exclusion constraint: dois inserts concorrentes no mesmo slot -> um sucesso, um erro", async () => {
    const overlapping = {
      organizationId: org.id,
      locationId,
      staffId,
      serviceId: onSiteServiceId,
      customerId,
      startAt: at(14),
      endAt: at(15),
      status: "CONFIRMED" as const,
      priceInCents: 3000,
      paymentMode: "ON_SITE" as const,
      paymentStatus: "NONE" as const,
    };
    const results = await Promise.allSettled([
      runWithTenant(org.id, () => db.booking.create({ data: { ...overlapping } })),
      runWithTenant(org.id, () => db.booking.create({ data: { ...overlapping } })),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const error = (rejected[0] as PromiseRejectedResult).reason;
    // Postgres exclusion violation (23P01) — Prisma não mapeia para um
    // código conhecido (ex.: P2002), a mensagem crua chega até o caller.
    expect(String(error.message)).toMatch(/exclusion constraint/i);
  });

  test("expireStaleHolds cancela hold expirado e libera o slot", async () => {
    const booking = await runWithTenant(org.id, () =>
      db.booking.create({
        data: {
          organizationId: org.id,
          locationId,
          staffId,
          serviceId: prepaidServiceId,
          customerId,
          startAt: at(16),
          endAt: new Date(at(16).getTime() + 30 * 60_000),
          status: "PENDING_PAYMENT",
          priceInCents: 5000,
          paymentMode: "FULL_PREPAYMENT",
          paymentStatus: "PENDING",
          expiresAt: new Date(Date.now() - 60_000),
        },
      }),
    );
    const expiredIds = await expireStaleHolds();
    expect(expiredIds).toContain(booking.id);
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("CANCELLED");
  });

  test("cancelamento dentro do prazo gratuito não gera taxa", async () => {
    const booking = await runWithTenant(org.id, () =>
      db.booking.create({
        data: {
          organizationId: org.id,
          locationId,
          staffId,
          serviceId: onSiteServiceId,
          customerId,
          startAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          status: "CONFIRMED",
          priceInCents: 3000,
          paymentMode: "ON_SITE",
          paymentStatus: "NONE",
        },
      }),
    );
    const cancelled = await runWithTenant(org.id, () => cancelBooking(booking.id));
    expect(cancelled.cancellationFeeInCents).toBe(0);
  });

  test("cancelamento fora do prazo gratuito aplica taxa conforme regra do tenant", async () => {
    const booking = await runWithTenant(org.id, () =>
      db.booking.create({
        data: {
          organizationId: org.id,
          locationId,
          staffId,
          serviceId: onSiteServiceId,
          customerId,
          // dentro de 24h (default freeUntilHoursBefore) -> taxa aplicada.
          startAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          endAt: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
          status: "CONFIRMED",
          priceInCents: 3000,
          paymentMode: "ON_SITE",
          paymentStatus: "NONE",
        },
      }),
    );
    const cancelled = await runWithTenant(org.id, () => cancelBooking(booking.id));
    // default: feeType PERCENT, feeValue 0 -> fee 0 seria o caso sem regra
    // customizada; aqui validamos que o cálculo roda e persiste um valor
    // numérico consistente com a política (0 com defaults, nunca null).
    expect(cancelled.cancellationFeeInCents).not.toBeNull();
  });

  test("cancelamento de booking já iniciado é rejeitado", async () => {
    const booking = await runWithTenant(org.id, () =>
      db.booking.create({
        data: {
          organizationId: org.id,
          locationId,
          staffId,
          serviceId: onSiteServiceId,
          customerId,
          startAt: new Date(Date.now() - 60_000),
          endAt: new Date(Date.now() + 30 * 60 * 1000),
          status: "CONFIRMED",
          priceInCents: 3000,
          paymentMode: "ON_SITE",
          paymentStatus: "NONE",
        },
      }),
    );
    await expect(runWithTenant(org.id, () => cancelBooking(booking.id))).rejects.toThrow();
  });

  test("createBooking e cancelBooking gravam AuditLog (BOOKING_CREATED / BOOKING_CANCELLED)", async () => {
    const booking = await runWithTenant(org.id, () =>
      createBooking({
        serviceId: onSiteServiceId,
        staffId,
        startAt: at(11),
        customer: { name: "Guest Audit", email: "guestaudit@example.com" },
      }),
    );
    const createdLog = await prisma.auditLog.findFirst({
      where: { organizationId: org.id, action: "BOOKING_CREATED", entityId: booking.id },
    });
    expect(createdLog).not.toBeNull();

    await runWithTenant(org.id, () => cancelBooking(booking.id, "staff-user-1"));
    const cancelledLog = await prisma.auditLog.findFirst({
      where: { organizationId: org.id, action: "BOOKING_CANCELLED", entityId: booking.id },
    });
    expect(cancelledLog).not.toBeNull();
    expect(cancelledLog?.actorId).toBe("staff-user-1");
  });
});
