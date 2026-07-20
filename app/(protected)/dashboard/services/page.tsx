import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { runWithTenant } from "@/lib/tenant-context";
import { db } from "@/lib/db";
import { PageContainer, PageHeader } from "@/app/_components/ui/page";
import { ServicesList } from "./services-list";

export default async function ServicesPage() {
  const requestHeaders = await headers(); const session = await auth.api.getSession({ headers: requestHeaders }); const slug = resolveTenantSlug(requestHeaders.get("host")); if (!session?.user || !slug) redirect("/"); const organization = await getOrganizationBySlug(slug); if (!organization) redirect("/"); const membership = await getMembership(organization.id, session.user.id); if (!membership) redirect("/dashboard");
  const services = await runWithTenant(organization.id, () => db.service.findMany({ include: { staff: { include: { staff: true } }, images: { orderBy: { sortOrder: "asc" } } }, orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }] }));
  const t = await getTranslations("dashboard.services");
  return (
    <PageContainer>
      <PageHeader eyebrow={t("catalog")} title={t("title")} />
      <ServicesList
        locale={organization.defaultLocale}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          imageUrl: service.imageUrl,
          durationMinutes: service.durationMinutes,
          priceInCents: service.priceInCents,
          currency: service.currency,
          isActive: service.isActive,
          paymentMode: service.paymentMode,
          depositPercent: service.depositPercent,
          images: service.images.map((image) => ({ url: image.url, publicId: image.publicId ?? undefined })),
          staffNames: service.staff.map((link) => link.staff.displayName),
        }))}
      />
    </PageContainer>
  );
}
