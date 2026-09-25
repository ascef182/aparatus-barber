import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDashboardContext } from "@/lib/services/dashboard-context-service";
import { PageContainer, PageHeader } from "@/app/_components/ui/page";
import { Card, CardContent } from "@/app/_components/ui/card";
import { ProfileForm } from "./profile-form";

/** "Meu perfil" do usuário logado no dashboard — qualquer role (não é
 * restrito a owner/manager como dashboard/settings, que edita a organização,
 * não a própria conta). */
export default async function DashboardProfilePage() {
  const requestHeaders = await headers();
  const ctx = await getDashboardContext(requestHeaders);
  if (!ctx) redirect("/");
  const { session } = ctx;

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
