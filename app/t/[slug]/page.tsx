import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getOrganizationBySlug } from "@/lib/services/organization-service";

/**
 * Landing white-label do tenant (placeholder da Fase 1).
 * O wizard de booking substitui esta página na Fase 2; branding na Fase 3.
 * Acessível apenas via rewrite do proxy ({slug}.aparatus.app), nunca por /t/.
 */
const TenantHomePage = async (props: PageProps<"/t/[slug]">) => {
  const { slug } = await props.params;
  const [organization, t] = await Promise.all([
    getOrganizationBySlug(slug),
    getTranslations("tenant"),
  ]);

  if (!organization || organization.status === "CHURNED") {
    notFound();
  }

  if (organization.status === "SUSPENDED") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">{t("suspended")}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-2xl font-bold">{organization.name}</h1>
      <p className="text-muted-foreground text-sm">{t("comingSoon")}</p>
    </main>
  );
};

export default TenantHomePage;
