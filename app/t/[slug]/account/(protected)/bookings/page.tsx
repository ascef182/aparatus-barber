import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { runWithTenant } from "@/lib/tenant-context";
import { findOrCreateCustomerForUser } from "@/lib/services/customer-service";
import { listBookingsForCustomer } from "@/lib/services/booking-service";
import { db } from "@/lib/db";
import { MyBookings } from "./my-bookings";
import { NewCustomerBookingSheet } from "./new-booking-sheet";

export default async function AccountBookingsPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");

  const [bookings, services, staffList] = await runWithTenant(organization.id, async () => {
    const customer = await findOrCreateCustomerForUser({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
    });
    return Promise.all([
      listBookingsForCustomer(customer.id),
      db.service.findMany({ where: { isActive: true }, select: { id: true, name: true, durationMinutes: true }, orderBy: { sortOrder: "asc" } }),
      db.staff.findMany({ where: { isActive: true }, select: { id: true, displayName: true, services: { select: { serviceId: true } } } }),
    ]);
  });

  const t = await getTranslations("account.bookings");

  return (
    <section>
      <header className="flex items-center justify-between gap-3 border-b bg-background p-5 md:p-8 md:pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <NewCustomerBookingSheet
          services={services}
          staff={staffList.map((member) => ({ id: member.id, displayName: member.displayName, serviceIds: member.services.map((link) => link.serviceId) }))}
        />
      </header>
      <MyBookings
        bookings={bookings.map((booking) => ({
          id: booking.id,
          startAt: booking.startAt.toISOString(),
          status: booking.status,
          service: booking.service.name,
          staff: booking.staff.displayName,
          priceInCents: booking.priceInCents,
          currency: booking.currency,
        }))}
        locale={organization.defaultLocale}
        timezone={organization.timezone}
      />
    </section>
  );
}
