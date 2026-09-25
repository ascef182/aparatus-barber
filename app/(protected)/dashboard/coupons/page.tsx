import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDashboardContext } from "@/lib/services/dashboard-context-service";
import { runWithTenant } from "@/lib/tenant-context";
import { db } from "@/lib/db";
import { countRedemptions } from "@/lib/services/coupon-service";
import { PageContainer, PageHeader } from "@/app/_components/ui/page";
import { CouponsList } from "./coupons-list";

export default async function CouponsPage() {
  const requestHeaders = await headers();
  const ctx = await getDashboardContext(requestHeaders);
  if (!ctx) redirect("/");
  const { organization } = ctx;
  const [coupons, services] = await runWithTenant(organization.id, () =>
    Promise.all([
      db.coupon.findMany({ include: { services: { include: { service: true } } }, orderBy: { createdAt: "desc" } }),
      db.service.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]),
  );
  const redemptions = await runWithTenant(organization.id, () =>
    Promise.all(coupons.map((coupon) => countRedemptions(coupon.id))),
  );
  const t = await getTranslations("dashboard.coupons");
  return (
    <PageContainer>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <CouponsList
        locale={organization.defaultLocale}
        currency={organization.currency}
        services={services}
        coupons={coupons.map((coupon, index) => ({
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          validFrom: coupon.validFrom?.toISOString() ?? null,
          validUntil: coupon.validUntil?.toISOString() ?? null,
          maxRedemptions: coupon.maxRedemptions,
          scope: coupon.scope,
          isActive: coupon.isActive,
          redemptions: redemptions[index] ?? 0,
          serviceIds: coupon.services.map((link) => link.serviceId),
        }))}
      />
    </PageContainer>
  );
}
