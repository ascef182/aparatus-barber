import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Contact, SearchX } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { runWithTenant } from "@/lib/tenant-context";
import { getCustomerStats, listCustomers, type CustomerStatusFilter } from "@/lib/services/customer-service";
import { PageContainer, PageHeader } from "@/app/_components/ui/page";
import { Button } from "@/app/_components/ui/button";
import { EmptyState } from "@/app/_components/ui/empty-state";
import { Input } from "@/app/_components/ui/input";
import { CustomersTable } from "./customers-table";

export default async function CustomersPage({ searchParams }: PageProps<"/dashboard/customers">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const statusFilter: CustomerStatusFilter = params.status === "active" || params.status === "blocked" ? params.status : "all";

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");
  const membership = await getMembership(organization.id, session.user.id);
  if (!membership) redirect("/dashboard");

  const customers = await runWithTenant(organization.id, () => listCustomers(query || undefined, statusFilter));
  const stats = await runWithTenant(organization.id, () => getCustomerStats(customers.map((c) => c.id)));
  const t = await getTranslations("dashboard.customers");

  const rows = customers.map((customer) => {
    const customerStats = stats.get(customer.id)!;
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      isBlocked: customer.isBlocked,
      tags: customer.tags,
      totalSpentInCents: customerStats.totalSpentInCents,
      lastVisitAt: customerStats.lastVisitAt ? customerStats.lastVisitAt.toISOString() : null,
      nextAppointmentAt: customerStats.nextAppointmentAt ? customerStats.nextAppointmentAt.toISOString() : null,
    };
  });

  const filterOptions: { value: CustomerStatusFilter; label: string }[] = [
    { value: "all", label: t("filterAll") },
    { value: "active", label: t("filterActive") },
    { value: "blocked", label: t("filterBlocked") },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        actions={
          <form className="flex gap-2">
            {statusFilter !== "all" && <input type="hidden" name="status" value={statusFilter} />}
            <Input name="q" defaultValue={query} placeholder={t("searchPlaceholder")} className="w-64" />
            <Button type="submit" variant="outline">{t("search")}</Button>
          </form>
        }
      />

      <div className="inline-flex w-fit rounded-lg border bg-card p-1">
        {filterOptions.map((option) => {
          const linkParams = new URLSearchParams();
          if (query) linkParams.set("q", query);
          if (option.value !== "all") linkParams.set("status", option.value);
          const href = linkParams.size ? `/dashboard/customers?${linkParams.toString()}` : "/dashboard/customers";
          return (
            <Link
              key={option.value}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        query.length > 0 ? (
          <EmptyState icon={SearchX} title={t("noSearchResults")} description={t("noSearchResultsDescription")} />
        ) : (
          <EmptyState icon={Contact} title={t("noCustomers")} description={t("noCustomersDescription")} />
        )
      ) : (
        <CustomersTable customers={rows} locale={organization.defaultLocale} currency={organization.currency} />
      )}
    </PageContainer>
  );
}
