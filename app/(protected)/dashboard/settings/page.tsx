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
import { listQuoteRequests } from "@/lib/services/quote-request-service";
import { isQuoteBasedCategory } from "@/lib/business-category";
import { PageContainer, PageHeader } from "@/app/_components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { RulesForm } from "./rules-form";
import { SecuritySection } from "./security-section";
import { ClosedPeriodForm } from "./closed-period-form";
import { TeamSection } from "./team-section";
import { ImpressumForm } from "./impressum-form";
import { DirectoryListingForm } from "./directory-listing-form";
import { CoverImageForm } from "./cover-image-form";
import { QuoteRequestsSection } from "./quote-requests-section";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ mfaRequired?: string }>;
}) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");
  const membership = await getMembership(organization.id, session.user.id);
  if (!membership || !["owner", "manager"].includes(membership.role)) redirect("/dashboard");
  const { mfaRequired } = await searchParams;
  const [rules, impressum, locations, members, pendingInvitations, quoteRequests] = await Promise.all([
    runWithTenant(organization.id, getResolvedRules),
    runWithTenant(organization.id, getImpressum),
    runWithTenant(organization.id, listLocations),
    listMembers(organization.id),
    listPendingInvitations(organization.id),
    isQuoteBasedCategory(organization.category)
      ? runWithTenant(organization.id, listQuoteRequests)
      : Promise.resolve([]),
  ]);
  const cities = [...new Set(locations.filter((l) => l.isActive).map((l) => l.city))];
  const t = await getTranslations("dashboard.settings");
  const isQuoteBased = isQuoteBasedCategory(organization.category);

  return (
    <PageContainer>
      <PageHeader eyebrow={t("operation")} title={t("pageTitle")} description={t("pageDescription")} />

      {mfaRequired === "1" && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {t("mfaRequiredBanner")}
        </div>
      )}

      {/* Aba padrão é "security" quando o gate de MFA (dashboard/layout.tsx)
          redireciona pra cá — sem isso o dono cairia na aba "Geral" e teria
          que procurar onde ativar o 2FA que acabou de ser exigido. */}
      <Tabs defaultValue={mfaRequired === "1" ? "security" : "general"}>
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="general">{t("tabGeneral")}</TabsTrigger>
            <TabsTrigger value="team">{t("tabTeam")}</TabsTrigger>
            <TabsTrigger value="legal">{t("tabLegal")}</TabsTrigger>
            <TabsTrigger value="directory">{t("tabDirectory")}</TabsTrigger>
            <TabsTrigger value="security">{t("tabSecurity")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("bookingSettings")}</CardTitle>
            </CardHeader>
            <CardContent>
              <RulesForm rules={rules} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("closePeriod")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ClosedPeriodForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("teamTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamSection
                members={members.map((m) => ({ id: m.id, role: m.role, userName: m.user.name, userEmail: m.user.email }))}
                pendingInvitations={pendingInvitations.map((i) => ({ id: i.id, email: i.email, role: i.role }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("impressumTitle")}</CardTitle>
              <CardDescription>{t("impressumHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ImpressumForm
                initial={
                  impressum
                    ? {
                        legalName: impressum.legalName,
                        addressLine1: impressum.addressLine1,
                        postalCode: impressum.postalCode,
                        city: impressum.city,
                        country: impressum.country,
                        representedBy: impressum.representedBy ?? "",
                        phone: impressum.phone ?? "",
                        email: impressum.email ?? "",
                        registerCourt: impressum.registerCourt ?? "",
                        registerNumber: impressum.registerNumber ?? "",
                        vatId: impressum.vatId ?? "",
                      }
                    : null
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("coverImageTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CoverImageForm initialCoverImageUrl={organization.coverImageUrl} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directory" className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("directoryTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DirectoryListingForm initialIsListed={organization.isListed} initialCategory={organization.category} cities={cities} />
            </CardContent>
          </Card>
          {isQuoteBased && (
            <Card>
              <CardHeader>
                <CardTitle>{t("quoteRequestsTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteRequestsSection
                  quoteRequests={quoteRequests.map((q) => ({
                    id: q.id,
                    customerName: q.customerName,
                    customerEmail: q.customerEmail,
                    customerPhone: q.customerPhone,
                    message: q.message,
                    status: q.status,
                    createdAt: q.createdAt.toISOString(),
                  }))}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySection twoFactorEnabled={!!session.user.twoFactorEnabled} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
