import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithPlatformScope, runWithTenant } from "@/lib/tenant-context";
import { createBooking } from "@/lib/services/booking-service";
import { createCoupon, updateCoupon, validateCoupon } from "@/lib/services/coupon-service";
import { futureMondayAt, futureMondayISO } from "../helpers/future-date";

/**
 * Fecha o gap descoberto durante a varredura de Phase B: cupons podiam ser
 * criados no dashboard (coupon-service.ts) mas nunca eram de fato
 * resgatáveis — createBooking não referenciava coupon/discountInCents em
 * lugar nenhum. Aqui exercitamos o caminho completo (validateCoupon +
 * createBooking com couponCode) contra os cenários de negação da política.
 */

const org = { id: randomUUID(), slug: `coupon-${randomUUID().slice(0, 8)}` };
let staffId: string;
let serviceAId: string; // preço 10000 (100.00)
let serviceBId: string; // fora do escopo dos cupons SELECTED_SERVICES

beforeAll(async () => {
  await prisma.organization.create({ data: { id: org.id, name: "Coupon Org", slug: org.slug } });
  await runWithPlatformScope(async () => {
    const location = await db.location.create({
      data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
    });
    const staff = await db.staff.create({ data: { organizationId: org.id, locationId: location.id, displayName: "Ana" } });
    staffId = staff.id;

    const serviceA = await db.service.create({
      data: { organizationId: org.id, name: "Corte A", durationMinutes: 30, priceInCents: 10000, paymentMode: "ON_SITE" },
    });
    serviceAId = serviceA.id;
    const serviceB = await db.service.create({
      data: { organizationId: org.id, name: "Corte B", durationMinutes: 30, priceInCents: 8000, paymentMode: "ON_SITE" },
    });
    serviceBId = serviceB.id;

    await db.staffService.createMany({
      data: [
        { organizationId: org.id, staffId, serviceId: serviceAId },
        { organizationId: org.id, staffId, serviceId: serviceBId },
      ],
    });
    await db.staffWorkingHours.create({
      data: { organizationId: org.id, staffId, weekday: 1, startTime: "00:00", endTime: "23:59" },
    });
  });
});

afterAll(async () => {
  await runWithPlatformScope(async () => {
    await db.booking.deleteMany({ where: { organizationId: org.id } });
    await db.customer.deleteMany({ where: { organizationId: org.id } });
    await db.couponService.deleteMany({ where: { organizationId: org.id } });
    await db.coupon.deleteMany({ where: { organizationId: org.id } });
    await db.staffWorkingHours.deleteMany({ where: { organizationId: org.id } });
    await db.staffService.deleteMany({ where: { organizationId: org.id } });
    await db.service.deleteMany({ where: { organizationId: org.id } });
    await db.staff.deleteMany({ where: { organizationId: org.id } });
    await db.location.deleteMany({ where: { organizationId: org.id } });
  });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

// Ver tests/helpers/future-date.ts: data literal aqui vence e derruba todo
// teste que passa por createBooking.
const MONDAY = futureMondayISO();
let slotHour = 8; // cada teste usa um horário diferente pra não colidir com o exclusion constraint
function nextSlot() {
  return futureMondayAt(slotHour++, MONDAY);
}

describe("validateCoupon", () => {
  test("PERCENT calcula desconto sobre o preço do serviço", async () => {
    const coupon = await runWithTenant(org.id, () =>
      db.coupon.create({ data: { organizationId: org.id, code: "PERCENT10", type: "PERCENT", value: 10 } }),
    );
    const result = await runWithTenant(org.id, () => validateCoupon("percent10", serviceAId, 10000));
    expect(result).toEqual({ valid: true, couponId: coupon.id, discountInCents: 1000 });
  });

  test("FIXED nunca deixa o desconto passar do preço do serviço", async () => {
    await runWithTenant(org.id, () =>
      db.coupon.create({ data: { organizationId: org.id, code: "HUGEFIXED", type: "FIXED", value: 999999 } }),
    );
    const result = await runWithTenant(org.id, () => validateCoupon("HUGEFIXED", serviceAId, 10000));
    expect(result.valid).toBe(true);
    expect((result as { discountInCents: number }).discountInCents).toBe(10000);
  });

  test("código inexistente é inválido", async () => {
    const result = await runWithTenant(org.id, () => validateCoupon("NAOEXISTE", serviceAId, 10000));
    expect(result).toEqual({ valid: false, reasonCode: "invalid", reason: expect.any(String) });
  });

  test("cupom inativo é inválido", async () => {
    await runWithTenant(org.id, () =>
      db.coupon.create({ data: { organizationId: org.id, code: "INATIVO", type: "PERCENT", value: 10, isActive: false } }),
    );
    const result = await runWithTenant(org.id, () => validateCoupon("INATIVO", serviceAId, 10000));
    expect(result).toMatchObject({ valid: false, reasonCode: "invalid" });
  });

  test("cupom expirado é rejeitado", async () => {
    await runWithTenant(org.id, () =>
      db.coupon.create({
        data: { organizationId: org.id, code: "EXPIRADO", type: "PERCENT", value: 10, validUntil: new Date("2020-01-01") },
      }),
    );
    const result = await runWithTenant(org.id, () => validateCoupon("EXPIRADO", serviceAId, 10000));
    expect(result).toMatchObject({ valid: false, reasonCode: "expired" });
  });

  test("cupom com maxRedemptions esgotado é rejeitado", async () => {
    await runWithTenant(org.id, () =>
      db.coupon.create({ data: { organizationId: org.id, code: "LIMITADO", type: "PERCENT", value: 10, maxRedemptions: 1 } }),
    );
    await runWithTenant(org.id, () =>
      createBooking({ serviceId: serviceAId, staffId, startAt: nextSlot(), customer: { name: "Cliente 1", email: "c1@example.com" }, couponCode: "LIMITADO" }),
    );
    const result = await runWithTenant(org.id, () => validateCoupon("LIMITADO", serviceAId, 10000));
    expect(result).toMatchObject({ valid: false, reasonCode: "exhausted" });
  });

  test("cupom SELECTED_SERVICES só vale para o serviço vinculado", async () => {
    const coupon = await runWithTenant(org.id, () =>
      db.coupon.create({ data: { organizationId: org.id, code: "SOA", type: "PERCENT", value: 20, scope: "SELECTED_SERVICES" } }),
    );
    await runWithTenant(org.id, () =>
      db.couponService.create({ data: { organizationId: org.id, couponId: coupon.id, serviceId: serviceAId } }),
    );
    const forA = await runWithTenant(org.id, () => validateCoupon("SOA", serviceAId, 10000));
    expect(forA).toEqual({ valid: true, couponId: coupon.id, discountInCents: 2000 });
    const forB = await runWithTenant(org.id, () => validateCoupon("SOA", serviceBId, 8000));
    expect(forB).toMatchObject({ valid: false, reasonCode: "wrong_service" });
  });
});

describe("createBooking com couponCode", () => {
  test("aplica o desconto: priceInCents preserva o preço cheio, discountInCents reflete o cupom", async () => {
    await runWithTenant(org.id, () =>
      db.coupon.create({ data: { organizationId: org.id, code: "BOOKING20", type: "PERCENT", value: 20 } }),
    );
    const booking = await runWithTenant(org.id, () =>
      createBooking({
        serviceId: serviceAId,
        staffId,
        startAt: nextSlot(),
        customer: { name: "Cliente Cupom", email: "cupom@example.com" },
        couponCode: "BOOKING20",
      }),
    );
    expect(booking.priceInCents).toBe(10000);
    expect(booking.discountInCents).toBe(2000);
    expect(booking.couponId).not.toBeNull();
  });

  test("código inválido rejeita a reserva inteira (não ignora silenciosamente)", async () => {
    await expect(
      runWithTenant(org.id, () =>
        createBooking({
          serviceId: serviceAId,
          staffId,
          startAt: nextSlot(),
          customer: { name: "Cliente Erro", email: "erro@example.com" },
          couponCode: "NAOEXISTE2",
        }),
      ),
    ).rejects.toThrow("Cupom inválido.");
  });

  test("sem couponCode, discountInCents fica zero e couponId nulo", async () => {
    const booking = await runWithTenant(org.id, () =>
      createBooking({
        serviceId: serviceAId,
        staffId,
        startAt: nextSlot(),
        customer: { name: "Cliente Sem Cupom", email: "semcupom@example.com" },
      }),
    );
    expect(booking.discountInCents).toBe(0);
    expect(booking.couponId).toBeNull();
  });
});

/**
 * Fecha o gap de gestão: createCoupon/updateCoupon eram dead code (dashboard
 * bypassava com um db.coupon.create inline) até este round — aqui exercitamos
 * o vínculo com CouponService (scope SELECTED_SERVICES) que só existe nesta
 * extensão das funções.
 */
describe("createCoupon / updateCoupon — vínculo com CouponService", () => {
  test("createCoupon com scope SELECTED_SERVICES cria os vínculos", async () => {
    const coupon = await runWithTenant(org.id, () =>
      createCoupon({
        code: "MGMT-CREATE",
        type: "PERCENT",
        value: 15,
        scope: "SELECTED_SERVICES",
        serviceIds: [serviceAId, serviceBId],
      }),
    );
    const links = await runWithTenant(org.id, () => db.couponService.findMany({ where: { couponId: coupon.id } }));
    expect(links.map((l) => l.serviceId).sort()).toEqual([serviceAId, serviceBId].sort());
  });

  test("createCoupon com scope ALL_SERVICES (default) não cria vínculo algum", async () => {
    const coupon = await runWithTenant(org.id, () =>
      createCoupon({ code: "MGMT-ALL", type: "FIXED", value: 500, serviceIds: [serviceAId] }),
    );
    expect(coupon.scope).toBe("ALL_SERVICES");
    const links = await runWithTenant(org.id, () => db.couponService.findMany({ where: { couponId: coupon.id } }));
    expect(links).toHaveLength(0);
  });

  test("updateCoupon substitui os vínculos quando serviceIds é enviado", async () => {
    const coupon = await runWithTenant(org.id, () =>
      createCoupon({ code: "MGMT-UPDATE", type: "PERCENT", value: 10, scope: "SELECTED_SERVICES", serviceIds: [serviceAId] }),
    );
    await runWithTenant(org.id, () => updateCoupon(coupon.id, { serviceIds: [serviceBId] }));
    const links = await runWithTenant(org.id, () => db.couponService.findMany({ where: { couponId: coupon.id } }));
    expect(links.map((l) => l.serviceId)).toEqual([serviceBId]);
  });

  test("updateCoupon sem serviceIds não mexe nos vínculos existentes", async () => {
    const coupon = await runWithTenant(org.id, () =>
      createCoupon({ code: "MGMT-KEEP", type: "PERCENT", value: 10, scope: "SELECTED_SERVICES", serviceIds: [serviceAId] }),
    );
    await runWithTenant(org.id, () => updateCoupon(coupon.id, { isActive: false }));
    const links = await runWithTenant(org.id, () => db.couponService.findMany({ where: { couponId: coupon.id } }));
    expect(links.map((l) => l.serviceId)).toEqual([serviceAId]);
  });
});
