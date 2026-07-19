import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { runWithTenant } from "@/lib/tenant-context";
import { getDashboardMetrics, type DashboardRange } from "@/lib/services/dashboard-metrics-service";
import { DashboardOverview } from "./overview";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const requestHeaders = await headers(); const session = await auth.api.getSession({ headers: requestHeaders }); const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) return null; const organization = await getOrganizationBySlug(slug); if (!organization) return null; const membership = await getMembership(organization.id, session.user.id); if (!membership) return null;
  if (membership.role !== "owner" && membership.role !== "manager") redirect("/dashboard/agenda");
  const rawRange = (await searchParams).range; const range = rawRange === "7" || rawRange === "30" || rawRange === "90" ? Number(rawRange) as DashboardRange : 1;
  const metrics = await runWithTenant(organization.id, () => getDashboardMetrics(organization.timezone, range));
  return <DashboardOverview metrics={metrics} role={membership.role} locale={organization.defaultLocale} currency={organization.currency} />;
}
