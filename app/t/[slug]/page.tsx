import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getOrganizationBySlug, isFreeTrialExpired } from "@/lib/services/organization-service";
import { runWithTenant } from "@/lib/tenant-context";
import { db } from "@/lib/db";
import { getImpressum } from "@/lib/services/impressum-service";
import { BookingWizard } from "./booking-wizard";

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

  if (isFreeTrialExpired(organization)) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="max-w-md text-center text-muted-foreground">{t("trialExpired")}</p>
      </main>
    );
  }

  const [services, staff, hasGermanLocation, impressum, defaultLocation] = await runWithTenant(organization.id, () => Promise.all([
    db.service.findMany({ where: { isActive: true }, select: { id: true, name: true, durationMinutes: true, priceInCents: true, currency: true, imageUrl: true }, orderBy: { sortOrder: "asc" } }),
    db.staff.findMany({ where: { isActive: true }, select: { id: true, displayName: true, services: { select: { serviceId: true } } } }),
    db.location.count({ where: { countryCode: "DE" } }).then((count) => count > 0),
    getImpressum(),
    db.location.findFirst({ orderBy: { createdAt: "asc" }, select: { phone: true, description: true } }),
  ]));

  // Impressumspflicht (§5 TMG): filial alemã sem Impressum preenchido não
  // pode aceitar reservas públicas — decisão do dono, mais estrita que a
  // recomendação original de não bloquear.
  if (hasGermanLocation && !impressum) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="max-w-md text-center text-muted-foreground">
          {t("impressumRequired")}
        </p>
      </main>
    );
  }

  return <main className="min-h-screen">{organization.coverImageUrl ? (
    <header className="relative flex min-h-48 items-end p-6 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- vem do Cloudinary, fora dos remotePatterns de next/image */}
      <img src={organization.coverImageUrl} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div>
        <h1 className="text-2xl font-bold">{organization.name}</h1>
        {defaultLocation?.description && <p className="mt-2 text-sm text-white/80">{defaultLocation.description}</p>}
        {defaultLocation?.phone && <p className="mt-1 text-sm text-white/80">{defaultLocation.phone}</p>}
      </div>
    </header>
  ) : (
    <header className="border-b p-6"><h1 className="text-2xl font-bold">{organization.name}</h1>{defaultLocation?.description && <p className="mt-2 text-sm text-muted-foreground">{defaultLocation.description}</p>}{defaultLocation?.phone && <p className="mt-1 text-sm text-muted-foreground">{defaultLocation.phone}</p>}</header>
  )}<BookingWizard locale={organization.defaultLocale as "de" | "en" | "pt"} services={services} staff={staff.map((member) => ({ id: member.id, displayName: member.displayName, serviceIds: member.services.map((link) => link.serviceId) }))} /></main>;
};

export default TenantHomePage;
