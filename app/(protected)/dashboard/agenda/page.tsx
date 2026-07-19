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
  const bookings = await runWithTenant(organization.id, async () => {
    const ownStaff = membership.role === "professional" ? await db.staff.findFirst({ where: { memberId: membership.id }, select: { id: true } }) : null;
    return db.booking.findMany({ where: ownStaff ? { staffId: ownStaff.id } : undefined, include: { customer: true, service: true, staff: true }, orderBy: { startAt: "asc" } });
  });
  return <Agenda timezone={organization.timezone} locale={organization.defaultLocale} nowISO={new Date().toISOString()} role={membership.role} currency={organization.currency} bookings={bookings.map((booking) => ({ id: booking.id, startAt: booking.startAt.toISOString(), customer: booking.customer.name, service: booking.service.name, staff: booking.staff.displayName, status: booking.status, paymentReceivedInCents: booking.paymentReceivedInCents, priceInCents: booking.priceInCents, discountInCents: booking.discountInCents }))} />;
}
