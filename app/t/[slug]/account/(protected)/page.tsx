import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { runWithTenant } from "@/lib/tenant-context";
import { findOrCreateCustomerForUser } from "@/lib/services/customer-service";
import { getCustomerOverviewStats } from "@/lib/services/booking-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";

export default async function AccountOverviewPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");

  const stats = await runWithTenant(organization.id, async () => {
    const customer = await findOrCreateCustomerForUser({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });
    return getCustomerOverviewStats(customer.id);
  });

  const t = await getTranslations("account.overview");
  const currencyFormatter = new Intl.NumberFormat(organization.defaultLocale, {
    style: "currency",
    currency: organization.currency,
  });
  const dateFormatter = new Intl.DateTimeFormat(organization.defaultLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: organization.timezone,
  });

  return (
    <section>
      <header className="border-b bg-background p-5 md:p-8 md:pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      </header>
      <div className="grid gap-4 p-5 md:grid-cols-3 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalBookings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.totalBookings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("completed")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.completedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalSpent")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{currencyFormatter.format(stats.totalSpentInCents / 100)}</p>
          </CardContent>
        </Card>
      </div>
      <div className="px-5 pb-8 md:px-8">
        <div className="flex items-center justify-between gap-3 pb-3">
          <h2 className="text-lg font-semibold tracking-tight">{t("upcomingTitle")}</h2>
          <Link href="/account/bookings" className="text-sm font-medium text-primary hover:underline">
            {t("viewAllBookings")}
          </Link>
        </div>
        {stats.upcomingBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noUpcoming")}</p>
        ) : (
          <div className="grid gap-3">
            {stats.upcomingBookings.map((booking) => (
              <article key={booking.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <p className="font-medium">{booking.service.name}</p>
                  <p className="text-sm text-muted-foreground">{dateFormatter.format(booking.startAt)}</p>
                </div>
                <span className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">{booking.status}</span>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
