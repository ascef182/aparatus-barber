import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { runWithTenant } from "@/lib/tenant-context";
import { db } from "@/lib/db";
import { Agenda } from "../agenda";

export default async function AgendaPage() {
  const requestHeaders = await headers(); const session = await auth.api.getSession({ headers: requestHeaders }); const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/"); const organization = await getOrganizationBySlug(slug); if (!organization) redirect("/"); const membership = await getMembership(organization.id, session.user.id); if (!membership) redirect("/");
  const now = new Date();
  // Mesmo padding de 1 dia usado pelo polling client-side (ver agenda.tsx)
  // ao redor da janela visível de 7 dias a partir de agora — sem isso a
  // query trazia TODAS as reservas já criadas, sem limite nenhum.
  const from = new Date(now.getTime() - 86400000);
  const to = new Date(now.getTime() + 8 * 86400000);
  const [bookings, services, staffList] = await runWithTenant(organization.id, async () => {
    const ownStaff = membership.role === "professional" ? await db.staff.findFirst({ where: { memberId: membership.id }, select: { id: true } }) : null;
    return Promise.all([
      db.booking.findMany({ where: { startAt: { gte: from, lt: to }, ...(ownStaff ? { staffId: ownStaff.id } : {}) }, include: { customer: true, service: true, staff: true }, orderBy: { startAt: "asc" } }),
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
      bookings={bookings.map((booking) => ({ id: booking.id, startAt: booking.startAt.toISOString(), endAt: booking.endAt.toISOString(), customer: booking.customer.name, service: booking.service.name, staffId: booking.staffId, staff: booking.staff.displayName, status: booking.status, paymentReceivedInCents: booking.paymentReceivedInCents, priceInCents: booking.priceInCents, discountInCents: booking.discountInCents }))}
      services={services}
      staff={staffList.map((member) => ({ id: member.id, displayName: member.displayName, color: member.color, serviceIds: member.services.map((link) => link.serviceId) }))}
    />
  );
}
