import { db } from "@/lib/db";
import { formatDateInTenantTz, tenantDayStartUtc } from "@/lib/dates";

export type DashboardRange = 1 | 7 | 30 | 90;

function shiftCivilDate(dateISO: string, days: number) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
  return shifted.toISOString().slice(0, 10);
}

export async function getDashboardMetrics(timezone: string, range: DashboardRange) {
  const today = formatDateInTenantTz(new Date(), timezone);
  const fromDate = shiftCivilDate(today, -(range - 1));
  const from = tenantDayStartUtc(fromDate, timezone);
  const to = tenantDayStartUtc(shiftCivilDate(today, 1), timezone);
  const bookings = await db.booking.findMany({
    where: { startAt: { gte: from, lt: to } },
    include: { staff: { select: { id: true, displayName: true } }, customer: { select: { id: true, name: true } }, service: { select: { name: true } } },
    orderBy: { startAt: "asc" },
  });
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
  return {
    range, fromDate, today, series: [...dayMap.values()],
    plannedRevenue: valid.reduce((total, booking) => total + booking.priceInCents - booking.discountInCents, 0),
    receivedRevenue: bookings.reduce((total, booking) => total + Math.max(0, booking.paymentReceivedInCents - booking.refundedAmountInCents), 0),
    uniqueCustomers: new Set(valid.map((booking) => booking.customerId)).size,
    completedCount: completed.length, noShowCount: noShows.length, bookingCount: bookings.length,
    noShowRate: bookings.length ? noShows.length / bookings.length : 0,
    pendingPayments: pendingPayments.map((booking) => ({ id: booking.id, customer: booking.customer.name, service: booking.service.name, startAt: booking.startAt.toISOString() })),
    topStaff: [...staffMap.values()].sort((a, b) => b.completed - a.completed || b.appointments - a.appointments).slice(0, 5),
  };
}
