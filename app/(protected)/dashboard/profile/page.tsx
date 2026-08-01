import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { PageContainer, PageHeader } from "@/app/_components/ui/page";
import { Card, CardContent } from "@/app/_components/ui/card";
import { ProfileForm } from "./profile-form";

/** "Meu perfil" do usuário logado no dashboard — qualquer role (não é
 * restrito a owner/manager como dashboard/settings, que edita a organização,
 * não a própria conta). */
export default async function DashboardProfilePage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");
  const membership = await getMembership(organization.id, session.user.id);
  if (!membership) redirect("/");

  const t = await getTranslations("dashboard.profile");

  return (
    <PageContainer>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <ProfileForm initialName={session.user.name} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
