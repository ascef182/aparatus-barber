import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDashboardContext } from "@/lib/services/dashboard-context-service";
import { runWithTenant } from "@/lib/tenant-context";
import { db } from "@/lib/db";
import { resolveOwnStaffBookingFilter } from "@/lib/authz";
import { Agenda } from "../agenda";

export default async function AgendaPage() {
  const requestHeaders = await headers();
  const ctx = await getDashboardContext(requestHeaders);
  if (!ctx) redirect("/");
  const { organization, membership } = ctx;
  const now = new Date();
  // Mesmo padding de 1 dia usado pelo polling client-side (ver agenda.tsx)
  // ao redor da janela visível de 7 dias a partir de agora — sem isso a
  // query trazia TODAS as reservas já criadas, sem limite nenhum.
  const from = new Date(now.getTime() - 86400000);
  const to = new Date(now.getTime() + 8 * 86400000);
  const [bookings, services, staffList] = await runWithTenant(organization.id, async () => {
    const ownStaffFilter = await resolveOwnStaffBookingFilter(membership);
    return Promise.all([
      db.booking.findMany({ where: { startAt: { gte: from, lt: to }, ...ownStaffFilter }, include: { customer: true, service: true, staff: true, attachments: true }, orderBy: { startAt: "asc" } }),
      db.service.findMany({ where: { isActive: true }, select: { id: true, name: true, durationMinutes: true, priceInCents: true, currency: true }, orderBy: { sortOrder: "asc" } }),
      db.staff.findMany({ where: { isActive: true }, select: { id: true, displayName: true, color: true, services: { select: { serviceId: true } } } }),
    ]);
  });
  return (
    <Agenda
      timezone={organization.timezone}
      locale={organization.defaultLocale}
      nowISO={now.toISOString()}
      role={membership.role}
      currency={organization.currency}
      bookings={bookings.map((booking) => ({ id: booking.id, startAt: booking.startAt.toISOString(), endAt: booking.endAt.toISOString(), customer: booking.customer.name, service: booking.service.name, staffId: booking.staffId, staff: booking.staff.displayName, status: booking.status, paymentReceivedInCents: booking.paymentReceivedInCents, priceInCents: booking.priceInCents, discountInCents: booking.discountInCents, referencePhotoUrls: booking.attachments.map((attachment) => attachment.url) }))}
      services={services}
      staff={staffList.map((member) => ({ id: member.id, displayName: member.displayName, color: member.color, serviceIds: member.services.map((link) => link.serviceId) }))}
    />
  );
}
