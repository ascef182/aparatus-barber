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
import { StaffList } from "./staff-list";

export default async function StaffPage() {
  const requestHeaders = await headers(); const session = await auth.api.getSession({ headers: requestHeaders }); const slug = resolveTenantSlug(requestHeaders.get("host")); if (!session?.user || !slug) redirect("/"); const organization = await getOrganizationBySlug(slug); if (!organization) redirect("/"); const membership = await getMembership(organization.id, session.user.id); if (!membership) redirect("/dashboard");
  const [staff, locations, services] = await runWithTenant(organization.id, () =>
    Promise.all([
      db.staff.findMany({
        include: {
          location: true,
          services: { include: { service: true } },
          workingHours: true,
          absences: { where: { endAt: { gt: new Date() } }, take: 1, orderBy: { startAt: "asc" } },
        },
        orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
      }),
      db.location.findMany({ orderBy: { createdAt: "asc" } }),
      db.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]),
  );
  const t = await getTranslations("dashboard.staff");
  return (
    <PageContainer>
      <PageHeader eyebrow={t("operation")} title={t("title")} />
      <StaffList
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
        staff={staff.map((member) => ({
          id: member.id,
          displayName: member.displayName,
          jobTitle: member.jobTitle,
          color: member.color,
          isActive: member.isActive,
          locationId: member.locationId,
          locationName: member.location.name,
          compensationType: member.compensationType,
          compensationAmountInCents: member.compensationAmountInCents,
          commissionBps: member.commissionBps,
          serviceIds: member.services.map((link) => link.service.id),
          serviceNames: member.services.map((link) => link.service.name),
          workingHours: member.workingHours.map((h) => ({ weekday: h.weekday, startTime: h.startTime, endTime: h.endTime })),
          upcomingAbsenceStart: member.absences[0]?.startAt.toLocaleDateString(organization.defaultLocale) ?? null,
        }))}
      />
    </PageContainer>
  );
}
