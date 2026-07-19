import { db } from "@/lib/db";
import { requireTenantId } from "@/lib/tenant-context";
import { getOrganizationById } from "@/lib/services/organization-service";
import { getResolvedRules } from "@/lib/services/settings-service";
import {
  addMinutes,
  formatTimeInTenantTz,
  overlaps,
  tenantDayEndUtc,
  tenantDayStartUtc,
  tenantTimeToUtc,
  tenantWeekday,
} from "@/lib/dates";

export type AvailableSlot = {
  startAt: Date; // UTC
  time: string; // "HH:mm" no tz do tenant (exibição)
  staffIds: string[]; // profissionais livres neste horário
};

export type AvailabilityQuery = {
  serviceId: string;
  dateISO: string; // "YYYY-MM-DD" no tz do tenant
  staffId?: string; // omitido = qualquer profissional que executa o serviço
  now?: Date; // injetável para testes
};

/**
 * Motor de disponibilidade (plano §4): para cada staff que executa o
 * serviço, janela do dia = working hours (weekday, vigência) − absences −
 * closed periods; candidatos a cada slotGranularity ocupando
 * [start, start + duração + buffers); remove colisões com bookings ativos;
 * aplica lead time min/max. A MESMA função serve UI pública, dashboard e
 * revalidação server-side no createBooking (exclusion constraint = rede
 * final contra race).
 */
export async function getAvailableSlots(
  query: AvailabilityQuery,
): Promise<AvailableSlot[]> {
  const organizationId = requireTenantId();
  const [organization, rules, service] = await Promise.all([
    getOrganizationById(organizationId),
    getResolvedRules(),
    db.service.findUnique({ where: { id: query.serviceId } }),
  ]);
  if (!organization || !service || !service.isActive) return [];

  const tz = organization.timezone;
  const now = query.now ?? new Date();

  // Janela de antecedência (no tz do tenant)
  const minStart = addMinutes(now, rules.minLeadTimeMinutes);
  const maxStart = addMinutes(now, rules.maxAdvanceDays * 24 * 60);
  const dayStart = tenantDayStartUtc(query.dateISO, tz);
  const dayEnd = tenantDayEndUtc(query.dateISO, tz);
  if (dayStart > maxStart || dayEnd < minStart) return [];

  // Staff que executa o serviço
  const links = await db.staffService.findMany({
    where: {
      serviceId: service.id,
      ...(query.staffId ? { staffId: query.staffId } : {}),
      staff: { is: { isActive: true } },
    },
  });
  const staffIds = links.map((l) => l.staffId);
  if (staffIds.length === 0) return [];

  const weekday = tenantWeekday(query.dateISO, tz);
  const totalMinutes =
    service.bufferBeforeMinutes +
    service.durationMinutes +
    service.bufferAfterMinutes;

  const [workingHours, absences, bookings, closedPeriods] = await Promise.all([
    db.staffWorkingHours.findMany({
      where: {
        staffId: { in: staffIds },
        weekday,
        OR: [{ validFrom: null }, { validFrom: { lte: dayStart } }],
        AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: dayEnd } }] }],
      },
    }),
    db.staffAbsence.findMany({
      where: {
        staffId: { in: staffIds },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
    }),
    db.booking.findMany({
      where: {
        staffId: { in: staffIds },
        status: { in: ["PENDING_PAYMENT", "PENDING", "CONFIRMED"] },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        // holds de pagamento expirados não bloqueiam
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
          { status: { not: "PENDING_PAYMENT" } },
        ],
      },
      select: { staffId: true, startAt: true, endAt: true },
    }),
    db.closedPeriod.findMany({
      where: { startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
    }),
  ]);

  const slotMap = new Map<number, { startAt: Date; staffIds: string[] }>();

  for (const staffId of staffIds) {
    const windows = workingHours.filter((w) => w.staffId === staffId);
    const staffAbsences = absences.filter((a) => a.staffId === staffId);
    const staffBookings = bookings.filter((b) => b.staffId === staffId);

    for (const window of windows) {
      const windowStart = tenantTimeToUtc(query.dateISO, window.startTime, tz);
      const windowEnd = tenantTimeToUtc(query.dateISO, window.endTime, tz);

      for (
        let cursor = windowStart;
        addMinutes(cursor, totalMinutes) <= windowEnd;
        cursor = addMinutes(cursor, rules.slotGranularityMinutes)
      ) {
        const slotEnd = addMinutes(cursor, totalMinutes);
        if (cursor < minStart || cursor > maxStart) continue;
        if (
          staffBookings.some((b) => overlaps(cursor, slotEnd, b.startAt, b.endAt))
        )
          continue;
        if (
          staffAbsences.some((a) => overlaps(cursor, slotEnd, a.startAt, a.endAt))
        )
          continue;
        if (
          closedPeriods.some((c) => overlaps(cursor, slotEnd, c.startAt, c.endAt))
        )
          continue;

        const key = cursor.getTime();
        const existing = slotMap.get(key);
        if (existing) {
          if (!existing.staffIds.includes(staffId))
            existing.staffIds.push(staffId);
        } else {
          slotMap.set(key, { startAt: cursor, staffIds: [staffId] });
        }
      }
    }
  }

  return [...slotMap.values()]
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .map((s) => ({
      ...s,
      time: formatTimeInTenantTz(s.startAt, tz),
    }));
}
