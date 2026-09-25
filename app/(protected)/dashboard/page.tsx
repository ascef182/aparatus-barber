import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDashboardContext } from "@/lib/services/dashboard-context-service";
import { runWithTenant } from "@/lib/tenant-context";
import { getDashboardMetrics, type DashboardRange } from "@/lib/services/dashboard-metrics-service";
import { DashboardOverview } from "./overview";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const requestHeaders = await headers();
  const ctx = await getDashboardContext(requestHeaders);
  if (!ctx) redirect("/");
  const { organization, membership } = ctx;
  if (membership.role !== "owner" && membership.role !== "manager") redirect("/dashboard/agenda");
  const rawRange = (await searchParams).range; const range = rawRange === "7" || rawRange === "30" || rawRange === "90" ? Number(rawRange) as DashboardRange : 1;
  const metrics = await runWithTenant(organization.id, () => getDashboardMetrics(organization.timezone, range));
  // key=range força remontar o componente (e o useQuery interno) ao trocar
  // de período — sem isso, o cache do React Query da rota anterior
  // sobreviveria à navegação client-side e mostraria dados do range errado
  // até o próximo poll.
  return <DashboardOverview key={range} metrics={metrics} role={membership.role} locale={organization.defaultLocale} currency={organization.currency} />;
}
