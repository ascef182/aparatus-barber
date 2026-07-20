import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { runWithTenant } from "@/lib/tenant-context";
import { listCustomers } from "@/lib/services/customer-service";
import { CustomerRow } from "./customer-row";

export default async function CustomersPage({ searchParams }: PageProps<"/dashboard/customers">) {
  const query = (await searchParams).q; const requestHeaders = await headers(); const session = await auth.api.getSession({ headers: requestHeaders }); const slug = resolveTenantSlug(requestHeaders.get("host")); if (!session?.user || !slug) redirect("/"); const organization = await getOrganizationBySlug(slug); if (!organization) redirect("/"); const membership = await getMembership(organization.id, session.user.id); if (!membership) redirect("/dashboard");
  const customers = await runWithTenant(organization.id, () => listCustomers(typeof query === "string" ? query : undefined));
  const t = await getTranslations("dashboard.customers");
  return <section className="p-6"><h1 className="text-2xl font-semibold">{t("title")}</h1><form className="my-4"><input className="rounded-md border p-2" name="q" defaultValue={typeof query === "string" ? query : ""} placeholder={t("searchPlaceholder")} /><button className="ml-2 rounded-md border px-3 py-2">{t("search")}</button></form><div className="overflow-hidden rounded-lg border bg-background"><table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">{t("colCustomer")}</th><th className="p-3">{t("colContact")}</th><th className="p-3">{t("colStatus")}</th><th className="p-3"></th></tr></thead><tbody>{customers.map((customer) => <CustomerRow key={customer.id} customer={customer} />)}</tbody></table></div></section>;
}
