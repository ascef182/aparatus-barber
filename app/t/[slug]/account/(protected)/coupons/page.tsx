import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { runWithTenant } from "@/lib/tenant-context";
import { findOrCreateCustomerForUser } from "@/lib/services/customer-service";
import { listClaimedCouponsForCustomer } from "@/lib/services/customer-coupon-service";
import { listCouponRedemptionsForCustomer } from "@/lib/services/coupon-service";
import { ClaimCouponForm } from "./claim-coupon-form";
import { RedemptionHistory } from "./redemption-history";

export default async function AccountCouponsPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");

  const [claimedCoupons, redemptions] = await runWithTenant(organization.id, async () => {
    const customer = await findOrCreateCustomerForUser({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });
    return Promise.all([
      listClaimedCouponsForCustomer(customer.id),
      listCouponRedemptionsForCustomer(customer.id),
    ]);
  });

  const t = await getTranslations("account.coupons");
  const dateFormatter = new Intl.DateTimeFormat(organization.defaultLocale, {
    dateStyle: "medium",
    timeZone: organization.timezone,
  });

  return (
    <section>
      <header className="border-b bg-background p-5 md:p-8 md:pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      </header>
      <div className="grid gap-8 p-5 md:p-8">
        <div className="max-w-md">
          <h2 className="pb-3 text-lg font-semibold tracking-tight">{t("claimTitle")}</h2>
          <ClaimCouponForm />
        </div>

        <div>
          <h2 className="pb-3 text-lg font-semibold tracking-tight">{t("myCoupons")}</h2>
          {claimedCoupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noCoupons")}</p>
          ) : (
            <div className="grid gap-3">
              {claimedCoupons.map((claim) => (
                <article key={claim.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{claim.coupon.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("redeemedOn")} {dateFormatter.format(claim.claimedAt)}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {claim.coupon.type === "PERCENT" ? `${claim.coupon.value}%` : `${(claim.coupon.value / 100).toFixed(2)}`}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="pb-3 text-lg font-semibold tracking-tight">{t("historyTitle")}</h2>
          <RedemptionHistory
            redemptions={redemptions.map((booking) => ({
              id: booking.id,
              startAt: booking.startAt.toISOString(),
              serviceName: booking.service.name,
              couponCode: booking.coupon?.code ?? "",
              discountInCents: booking.discountInCents,
              currency: booking.currency,
            }))}
            locale={organization.defaultLocale}
            timezone={organization.timezone}
          />
        </div>
      </div>
    </section>
  );
}
