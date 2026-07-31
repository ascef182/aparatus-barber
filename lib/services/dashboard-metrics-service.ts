import { db } from "@/lib/db";
import {
  formatDateInTenantTz,
  overlaps,
  tenantDayEndUtc,
  tenantDayStartUtc,
  tenantTimeToUtc,
  tenantWeekday,
} from "@/lib/dates";

export type DashboardRange = 1 | 7 | 30 | 90;

function shiftCivilDate(dateISO: string, days: number) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
  return shifted.toISOString().slice(0, 10);
}

/** % de mudança vs. período anterior — null (não "0%") quando a base
 * anterior é zero, pra não sugerir uma queda de -100% que não existiu. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

type PeriodTotals = {
  receivedRevenue: number;
  plannedRevenue: number;
  bookingCount: number;
  completedCount: number;
  noShowCount: number;
  uniqueCustomers: number;
};

/** Totais de um intervalo [from, to) — sem série diária nem ranking de
 * staff, que só fazem sentido pro período atual (não pro anterior, usado
 * só pra calcular variação percentual). */
async function computePeriodTotals(from: Date, to: Date): Promise<PeriodTotals> {
  const bookings = await db.booking.findMany({
    where: { startAt: { gte: from, lt: to } },
    select: { status: true, priceInCents: true, discountInCents: true, paymentReceivedInCents: true, refundedAmountInCents: true, customerId: true },
  });
  const valid = bookings.filter((b) => !["CANCELLED", "NO_SHOW", "PENDING_PAYMENT"].includes(b.status));
  return {
    receivedRevenue: bookings.reduce((total, b) => total + Math.max(0, b.paymentReceivedInCents - b.refundedAmountInCents), 0),
    plannedRevenue: valid.reduce((total, b) => total + b.priceInCents - b.discountInCents, 0),
    bookingCount: bookings.length,
    completedCount: bookings.filter((b) => b.status === "COMPLETED").length,
    noShowCount: bookings.filter((b) => b.status === "NO_SHOW").length,
    uniqueCustomers: new Set(valid.map((b) => b.customerId)).size,
  };
}

/**
 * Taxa de ocupação: minutos reservados (CONFIRMED/COMPLETED) ÷ minutos
 * disponíveis (StaffWorkingHours por staff ativo, menos StaffAbsence que
 * sobrepõe a janela), somados em todos os dias do período. Não reaproveita
 * o motor de disponibilidade (lib/scheduling/availability.ts) porque este é
 * agregado e não por serviço/slot — ali a granularidade é por candidato de
 * slot de UM serviço, aqui é capacidade bruta de horário de trabalho.
 */
async function computeOccupancyRate(fromDate: string, toDateExclusive: string, timezone: string): Promise<number | null> {
  const staff = await db.staff.findMany({ where: { isActive: true }, select: { id: true } });
  const staffIds = staff.map((s) => s.id);
  if (!staffIds.length) return null;

  const rangeStart = tenantDayStartUtc(fromDate, timezone);
  const rangeEnd = tenantDayStartUtc(toDateExclusive, timezone);

  const [workingHours, absences, bookings] = await Promise.all([
    db.staffWorkingHours.findMany({ where: { staffId: { in: staffIds } } }),
    db.staffAbsence.findMany({ where: { staffId: { in: staffIds }, startAt: { lt: rangeEnd }, endAt: { gt: rangeStart } } }),
    db.booking.findMany({
      where: { staffId: { in: staffIds }, startAt: { lt: rangeEnd }, endAt: { gt: rangeStart }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      select: { startAt: true, endAt: true },
    }),
  ]);

  let availableMinutes = 0;
  for (let cursor = fromDate; cursor < toDateExclusive; cursor = shiftCivilDate(cursor, 1)) {
    const weekday = tenantWeekday(cursor, timezone);
    const dayStart = tenantDayStartUtc(cursor, timezone);
    const dayEnd = tenantDayEndUtc(cursor, timezone);
    for (const staffId of staffIds) {
      const windows = workingHours.filter(
        (w) => w.staffId === staffId && w.weekday === weekday && (!w.validFrom || w.validFrom <= dayStart) && (!w.validUntil || w.validUntil >= dayEnd),
      );
      for (const window of windows) {
        const windowStart = tenantTimeToUtc(cursor, window.startTime, timezone);
        const windowEnd = tenantTimeToUtc(cursor, window.endTime, timezone);
        let minutes = (windowEnd.getTime() - windowStart.getTime()) / 60_000;
        for (const absence of absences) {
          if (absence.staffId !== staffId || !overlaps(windowStart, windowEnd, absence.startAt, absence.endAt)) continue;
          const overlapStart = Math.max(windowStart.getTime(), absence.startAt.getTime());
          const overlapEnd = Math.min(windowEnd.getTime(), absence.endAt.getTime());
          minutes -= Math.max(0, (overlapEnd - overlapStart) / 60_000);
        }
        availableMinutes += Math.max(0, minutes);
      }
    }
  }
  if (availableMinutes === 0) return null;

  const bookedMinutes = bookings.reduce((total, b) => total + Math.max(0, (b.endAt.getTime() - b.startAt.getTime()) / 60_000), 0);
  return Math.min(1, bookedMinutes / availableMinutes);
}

/** Uma query (bookings do período, com relations) agregada em memória em
 * série diária + ranking de staff — evita N+1 de uma query por dia/staff. */
export async function getDashboardMetrics(timezone: string, range: DashboardRange) {
  const today = formatDateInTenantTz(new Date(), timezone);
  const fromDate = shiftCivilDate(today, -(range - 1));
  const toDate = shiftCivilDate(today, 1);
  const from = tenantDayStartUtc(fromDate, timezone);
  const to = tenantDayStartUtc(toDate, timezone);

  // Período anterior de mesmo tamanho, imediatamente antes — só pra
  // calcular variação percentual (ex.: receita "+18%"), nunca exibido
  // sozinho.
  const previousFromDate = shiftCivilDate(fromDate, -range);
  const previousFrom = tenantDayStartUtc(previousFromDate, timezone);
  const previousTo = from;

  const [bookings, previousTotals, occupancyRate, previousOccupancyRate, newCustomersCount, previousNewCustomersCount] = await Promise.all([
    db.booking.findMany({
      where: { startAt: { gte: from, lt: to } },
      include: { staff: { select: { id: true, displayName: true } }, customer: { select: { id: true, name: true } }, service: { select: { name: true } } },
      orderBy: { startAt: "asc" },
    }),
    computePeriodTotals(previousFrom, previousTo),
    computeOccupancyRate(fromDate, toDate, timezone),
    computeOccupancyRate(previousFromDate, fromDate, timezone),
    db.customer.count({ where: { createdAt: { gte: from, lt: to } } }),
    db.customer.count({ where: { createdAt: { gte: previousFrom, lt: previousTo } } }),
  ]);

  const valid = bookings.filter((booking) => !["CANCELLED", "NO_SHOW", "PENDING_PAYMENT"].includes(booking.status));
  const completed = bookings.filter((booking) => booking.status === "COMPLETED");
  const noShows = bookings.filter((booking) => booking.status === "NO_SHOW");
  const pendingPayments = bookings.filter((booking) => booking.status === "PENDING_PAYMENT");
  const dayMap = new Map<string, { date: string; planned: number; received: number; appointments: number }>();
  for (let i = 0; i < range; i++) { const date = shiftCivilDate(fromDate, i); dayMap.set(date, { date, planned: 0, received: 0, appointments: 0 }); }
  const staffMap = new Map<string, { name: string; completed: number; appointments: number }>();
  for (const booking of bookings) {
    const key = formatDateInTenantTz(booking.startAt, timezone);
    const day = dayMap.get(key); const netReceived = Math.max(0, booking.paymentReceivedInCents - booking.refundedAmountInCents);
    if (day) { day.received += netReceived; if (!['CANCELLED', 'NO_SHOW', 'PENDING_PAYMENT'].includes(booking.status)) day.planned += booking.priceInCents - booking.discountInCents; day.appointments += 1; }
    const staff = staffMap.get(booking.staffId) ?? { name: booking.staff.displayName, completed: 0, appointments: 0 };
    staff.appointments += 1; if (booking.status === "COMPLETED") staff.completed += 1; staffMap.set(booking.staffId, staff);
  }

  const receivedRevenue = bookings.reduce((total, booking) => total + Math.max(0, booking.paymentReceivedInCents - booking.refundedAmountInCents), 0);
  const completedCount = completed.length;
  const bookingCount = bookings.length;
  const uniqueCustomers = new Set(valid.map((booking) => booking.customerId)).size;
  // Ticket médio sobre reservas concluídas (o valor efetivamente cobrado
  // por um atendimento realizado) — sobre bookingCount incluiria reservas
  // futuras/pendentes ainda sem pagamento recebido, subestimando o ticket.
  const avgTicketInCents = completedCount ? Math.round(receivedRevenue / completedCount) : 0;
  const previousAvgTicketInCents = previousTotals.completedCount ? Math.round(previousTotals.receivedRevenue / previousTotals.completedCount) : 0;

  return {
    range, fromDate, today, series: [...dayMap.values()],
    plannedRevenue: valid.reduce((total, booking) => total + booking.priceInCents - booking.discountInCents, 0),
    receivedRevenue,
    uniqueCustomers,
    completedCount, noShowCount: noShows.length, bookingCount,
    noShowRate: bookings.length ? noShows.length / bookings.length : 0,
    pendingPayments: pendingPayments.map((booking) => ({ id: booking.id, customer: booking.customer.name, service: booking.service.name, startAt: booking.startAt.toISOString() })),
    topStaff: [...staffMap.values()].sort((a, b) => b.completed - a.completed || b.appointments - a.appointments).slice(0, 5),
    avgTicketInCents,
    newCustomersCount,
    occupancyRate,
    trends: {
      receivedRevenue: percentChange(receivedRevenue, previousTotals.receivedRevenue),
      bookingCount: percentChange(bookingCount, previousTotals.bookingCount),
      completedCount: percentChange(completedCount, previousTotals.completedCount),
      uniqueCustomers: percentChange(uniqueCustomers, previousTotals.uniqueCustomers),
      avgTicketInCents: percentChange(avgTicketInCents, previousAvgTicketInCents),
      newCustomersCount: percentChange(newCustomersCount, previousNewCustomersCount),
      occupancyRate: occupancyRate !== null && previousOccupancyRate !== null ? percentChange(occupancyRate, previousOccupancyRate) : null,
    },
  };
}
