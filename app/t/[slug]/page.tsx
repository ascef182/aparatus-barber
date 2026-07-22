import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getOrganizationBySlug, isFreeTrialExpired } from "@/lib/services/organization-service";
import { runWithTenant } from "@/lib/tenant-context";
import { db } from "@/lib/db";
import { getImpressum } from "@/lib/services/impressum-service";
import { getTenantUrl } from "@/lib/tenant-host";
import { isQuoteBasedCategory } from "@/lib/business-category";
import { ServiceItem } from "./service-item";
import { BookingStatusToast } from "./booking-status-toast";
import { BackButton } from "./back-button";
import { StructuredData } from "./structured-data";
import { QuoteRequestForm } from "./quote-request-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);
  if (!organization || organization.status === "CHURNED") return {};

  const location = await runWithTenant(organization.id, () =>
    db.location.findFirst({ orderBy: { createdAt: "asc" }, select: { description: true, city: true } }),
  );
  const url = getTenantUrl(slug);
  const title = `${organization.name} — Agendamento online`;
  const description =
    location?.description ?? `Agende seu horário em ${organization.name}${location?.city ? ` — ${location.city}` : ""}.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: organization.name,
      locale: organization.defaultLocale,
      images: organization.coverImageUrl ? [{ url: organization.coverImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: organization.coverImageUrl ? [organization.coverImageUrl] : undefined,
    },
  };
}

/**
 * Landing white-label do tenant (placeholder da Fase 1).
 * Branding na Fase 3. Acessível apenas via rewrite do proxy
 * ({slug}.bladiq.com), nunca por /t/.
 */
const TenantHomePage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ booking?: string }>;
}) => {
  const { slug } = await params;
  const { booking: bookingStatus } = await searchParams;
  const [organization, t, tBooking] = await Promise.all([
    getOrganizationBySlug(slug),
    getTranslations("tenant"),
    getTranslations("booking"),
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
    db.location.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, phone: true, description: true, addressLine1: true, postalCode: true, city: true, countryCode: true } }),
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

  const locale = organization.defaultLocale as "de" | "en" | "pt";
  const staffList = staff.map((member) => ({ id: member.id, displayName: member.displayName, serviceIds: member.services.map((link) => link.serviceId) }));
  const status = bookingStatus === "success" || bookingStatus === "canceled" ? bookingStatus : null;

  return (
    <main className="relative min-h-screen">
      <StructuredData
        organizationName={organization.name}
        category={organization.category}
        url={getTenantUrl(slug)}
        location={defaultLocation}
        services={services}
        image={organization.coverImageUrl}
      />
      <BookingStatusToast status={status} successMessage={t("bookingSuccessBanner")} canceledMessage={t("bookingCanceledBanner")} />
      <BackButton />
      {organization.coverImageUrl ? (
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
        <header className="border-b p-6">
          <h1 className="text-2xl font-bold">{organization.name}</h1>
          {defaultLocation?.description && <p className="mt-2 text-sm text-muted-foreground">{defaultLocation.description}</p>}
          {defaultLocation?.phone && <p className="mt-1 text-sm text-muted-foreground">{defaultLocation.phone}</p>}
        </header>
      )}
      <section className="mx-auto flex max-w-2xl flex-col gap-3 p-6">
        {isQuoteBasedCategory(organization.category) ? (
          <>
            {services.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {services.map((service) => service.name).join(" · ")}
              </p>
            )}
            <QuoteRequestForm locationId={defaultLocation?.id} />
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold">{tBooking("chooseService")}</h2>
            {services.map((service) => (
              <ServiceItem
                key={service.id}
                service={service}
                eligibleStaff={staffList.filter((member) => member.serviceIds.includes(service.id))}
                organizationName={organization.name}
                locale={locale}
              />
            ))}
          </>
        )}
      </section>
    </main>
  );
};

export default TenantHomePage;
