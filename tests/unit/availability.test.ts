import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { getAvailableSlots } from "@/lib/scheduling/availability";

/**
 * Motor de disponibilidade (lib/scheduling/availability.ts) — working hours,
 * buffers, ausências, períodos fechados e transições de DST em Europe/Berlin.
 * Sem settings salvos -> defaults (slotGranularityMinutes=15, minLeadTimeMinutes=60,
 * maxAdvanceDays=60).
 */

const TZ = "Europe/Berlin";
const org = { id: randomUUID(), slug: `avail-${randomUUID().slice(0, 8)}` };
let locationId: string;
let staffId: string;
let serviceId: string; // 30min, sem buffer
let bufferedServiceId: string; // 30min + 15min buffer antes/depois (total 60min)

// "now" alguns dias antes de cada data de teste — dentro da janela de
// antecedência máxima (60 dias) e sem colidir com o lead time mínimo (60min).
const daysBefore = (dateISO: string, days: number) =>
  new Date(new Date(`${dateISO}T00:00:00Z`).getTime() - days * 86_400_000);

beforeAll(async () => {
  await prisma.organization.create({
    data: { id: org.id, name: "Avail Org", slug: org.slug, timezone: TZ },
  });
  const location = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: "Filial",
      addressLine1: "Str 1",
      postalCode: "10115",
      city: "Berlin",
    },
  });
  locationId = location.id;

  const staff = await prisma.staff.create({
    data: { organizationId: org.id, locationId, displayName: "Ana" },
  });
  staffId = staff.id;

  const service = await prisma.service.create({
    data: {
      organizationId: org.id,
      name: "Corte",
      durationMinutes: 30,
      priceInCents: 3000,
    },
  });
  serviceId = service.id;
  await prisma.staffService.create({
    data: { organizationId: org.id, staffId, serviceId },
  });

  const bufferedService = await prisma.service.create({
    data: {
      organizationId: org.id,
      name: "Corte com buffer",
      durationMinutes: 30,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      priceInCents: 3000,
    },
  });
  bufferedServiceId = bufferedService.id;
  await prisma.staffService.create({
    data: { organizationId: org.id, staffId, serviceId: bufferedServiceId },
  });

  // Segunda-feira (weekday=1): 2026-08-10 e 2026-08-17.
  await prisma.staffWorkingHours.create({
    data: { organizationId: org.id, staffId, weekday: 1, startTime: "09:00", endTime: "18:00" },
  });
  // Domingo (weekday=0): 2026-03-29 (CET->CEST) e 2026-10-25 (CEST->CET).
  await prisma.staffWorkingHours.create({
    data: { organizationId: org.id, staffId, weekday: 0, startTime: "09:00", endTime: "18:00" },
  });
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { organizationId: org.id } });
  await prisma.staffAbsence.deleteMany({ where: { organizationId: org.id } });
  await prisma.closedPeriod.deleteMany({ where: { organizationId: org.id } });
  await prisma.staffWorkingHours.deleteMany({ where: { organizationId: org.id } });
  await prisma.staffService.deleteMany({ where: { organizationId: org.id } });
  await prisma.service.deleteMany({ where: { organizationId: org.id } });
  await prisma.staff.deleteMany({ where: { organizationId: org.id } });
  await prisma.location.deleteMany({ where: { organizationId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("availability engine", () => {
  test("slot correto gerado para staff com working hours 09:00-18:00", async () => {
    const slots = await runWithTenant(org.id, () =>
      getAvailableSlots({ serviceId, dateISO: "2026-08-10", now: daysBefore("2026-08-10", 5) }),
    );
    // 30min de duração, granularidade 15min: último cursor válido é 17:30.
    // (17:30 - 09:00) / 15min + 1 = 35 slots.
    expect(slots).toHaveLength(35);
    expect(slots[0]?.time).toBe("09:00");
    expect(slots.at(-1)?.time).toBe("17:30");
    expect(slots[0]?.staffIds).toEqual([staffId]);
  });

  test("buffer before/after aplicado corretamente", async () => {
    const slots = await runWithTenant(org.id, () =>
      getAvailableSlots({ serviceId: bufferedServiceId, dateISO: "2026-08-10", now: daysBefore("2026-08-10", 5) }),
    );
    // total = 15+30+15 = 60min: último cursor válido é 17:00.
    // (17:00 - 09:00) / 15min + 1 = 33 slots (menos que os 35 sem buffer).
    expect(slots).toHaveLength(33);
    expect(slots[0]?.time).toBe("09:00");
    expect(slots.at(-1)?.time).toBe("17:00");
  });

  test("slot indisponível quando StaffAbsence cobre o período", async () => {
    const { tenantTimeToUtc } = await import("@/lib/dates");
    await prisma.staffAbsence.create({
      data: {
        organizationId: org.id,
        staffId,
        startAt: tenantTimeToUtc("2026-08-10", "09:00", TZ),
        endAt: tenantTimeToUtc("2026-08-10", "12:00", TZ),
      },
    });
    try {
      const slots = await runWithTenant(org.id, () =>
        getAvailableSlots({ serviceId, dateISO: "2026-08-10", now: daysBefore("2026-08-10", 5) }),
      );
      expect(slots.every((s) => s.time >= "12:00")).toBe(true);
      expect(slots[0]?.time).toBe("12:00");
    } finally {
      await prisma.staffAbsence.deleteMany({ where: { organizationId: org.id } });
    }
  });

  test("slot indisponível quando ClosedPeriod do tenant cobre o período", async () => {
    const { tenantDayStartUtc, tenantDayEndUtc } = await import("@/lib/dates");
    await prisma.closedPeriod.create({
      data: {
        organizationId: org.id,
        name: "Feriado",
        startAt: tenantDayStartUtc("2026-08-17", TZ),
        endAt: tenantDayEndUtc("2026-08-17", TZ),
      },
    });
    try {
      const slots = await runWithTenant(org.id, () =>
        getAvailableSlots({ serviceId, dateISO: "2026-08-17", now: daysBefore("2026-08-17", 5) }),
      );
      expect(slots).toHaveLength(0);
    } finally {
      await prisma.closedPeriod.deleteMany({ where: { organizationId: org.id } });
    }
  });

  test("transição DST CET->CEST (2026-03-29) não gera slot fantasma", async () => {
    const slots = await runWithTenant(org.id, () =>
      getAvailableSlots({ serviceId, dateISO: "2026-03-29", now: daysBefore("2026-03-29", 5) }),
    );
    expect(slots).toHaveLength(35);
    expect(slots[0]?.time).toBe("09:00");
    expect(slots.at(-1)?.time).toBe("17:30");
    // 09:00 Berlin já em CEST (UTC+2) nesta data -> 07:00 UTC.
    expect(slots[0]?.startAt.toISOString()).toBe("2026-03-29T07:00:00.000Z");
  });

  test("transição DST CEST->CET (2026-10-25) não duplica slot", async () => {
    const slots = await runWithTenant(org.id, () =>
      getAvailableSlots({ serviceId, dateISO: "2026-10-25", now: daysBefore("2026-10-25", 5) }),
    );
    expect(slots).toHaveLength(35);
    expect(slots[0]?.time).toBe("09:00");
    expect(slots.at(-1)?.time).toBe("17:30");
    // 09:00 Berlin já em CET (UTC+1) nesta data -> 08:00 UTC.
    expect(slots[0]?.startAt.toISOString()).toBe("2026-10-25T08:00:00.000Z");
  });
});
