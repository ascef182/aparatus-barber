import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership, listMembers, listPendingInvitations } from "@/lib/services/member-service";
import { runWithTenant } from "@/lib/tenant-context";
import { getResolvedRules } from "@/lib/services/settings-service";
import { getImpressum } from "@/lib/services/impressum-service";
import { listLocations } from "@/lib/services/location-service";
import { RulesForm } from "./rules-form";
import { SecuritySection } from "./security-section";
import { ClosedPeriodForm } from "./closed-period-form";
import { TeamSection } from "./team-section";
import { ImpressumForm } from "./impressum-form";
import { DirectoryListingForm } from "./directory-listing-form";
import { CoverImageForm } from "./cover-image-form";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ mfaRequired?: string }>;
}) {
  const requestHeaders = await headers(); const session = await auth.api.getSession({ headers: requestHeaders }); const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/"); const organization = await getOrganizationBySlug(slug); if (!organization) redirect("/"); const membership = await getMembership(organization.id, session.user.id); if (!membership || !["owner", "manager"].includes(membership.role)) redirect("/dashboard");
  const { mfaRequired } = await searchParams;
  const [rules, impressum, locations, members, pendingInvitations] = await Promise.all([
    runWithTenant(organization.id, getResolvedRules),
    runWithTenant(organization.id, getImpressum),
    runWithTenant(organization.id, listLocations),
    listMembers(organization.id),
    listPendingInvitations(organization.id),
  ]);
  const cities = [...new Set(locations.filter((l) => l.isActive).map((l) => l.city))];
  const t = await getTranslations("dashboard.settings");
  return <section className="flex flex-col gap-8 p-6">{mfaRequired === "1" && <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{t("mfaRequiredBanner")}</div>}<div><p className="text-sm text-muted-foreground">{t("operation")}</p><h1 className="mb-6 text-2xl font-semibold">{t("bookingSettings")}</h1><RulesForm rules={rules} /></div><div><h2 className="mb-3 text-lg font-semibold">{t("closePeriod")}</h2><ClosedPeriodForm /></div><TeamSection members={members.map((m) => ({ id: m.id, role: m.role, userName: m.user.name, userEmail: m.user.email }))} pendingInvitations={pendingInvitations.map((i) => ({ id: i.id, email: i.email, role: i.role }))} /><div><h2 className="mb-3 text-lg font-semibold">{t("impressumTitle")}</h2><p className="mb-3 text-sm text-muted-foreground">{t("impressumHint")}</p><ImpressumForm initial={impressum ? { legalName: impressum.legalName, addressLine1: impressum.addressLine1, postalCode: impressum.postalCode, city: impressum.city, country: impressum.country, representedBy: impressum.representedBy ?? "", phone: impressum.phone ?? "", email: impressum.email ?? "", registerCourt: impressum.registerCourt ?? "", registerNumber: impressum.registerNumber ?? "", vatId: impressum.vatId ?? "" } : null} /></div><div><h2 className="mb-3 text-lg font-semibold">{t("coverImageTitle")}</h2><CoverImageForm initialCoverImageUrl={organization.coverImageUrl} /></div><div><h2 className="mb-3 text-lg font-semibold">{t("directoryTitle")}</h2><DirectoryListingForm initialIsListed={organization.isListed} cities={cities} /></div><SecuritySection twoFactorEnabled={!!session.user.twoFactorEnabled} /></section>;
}
