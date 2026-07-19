import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getImpressum } from "@/lib/services/impressum-service";
import { runWithTenant } from "@/lib/tenant-context";

export default async function TenantImpressumPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const organization = await getOrganizationBySlug(slug);
  if (!organization) notFound();
  const impressum = await runWithTenant(organization.id, getImpressum);
  if (!impressum) notFound();
  const t = await getTranslations("tenant.impressum");

  return (
    <main className="mx-auto max-w-3xl p-8 py-16 text-sm leading-relaxed">
      <h1 className="mb-6 text-2xl font-semibold">Impressum — {organization.name}</h1>
      <p>{impressum.legalName}</p>
      <p>{impressum.addressLine1}</p>
      <p>{impressum.postalCode} {impressum.city}, {impressum.country}</p>
      {impressum.representedBy && (
        <p className="mt-4">{t("representedBy")} {impressum.representedBy}</p>
      )}
      {impressum.phone && <p>{t("phone")} {impressum.phone}</p>}
      {impressum.email && <p>{t("email")} {impressum.email}</p>}
      {(impressum.registerCourt || impressum.registerNumber) && (
        <p className="mt-4">
          {impressum.registerCourt}
          {impressum.registerCourt && impressum.registerNumber ? ", " : ""}
          {impressum.registerNumber}
        </p>
      )}
      {impressum.vatId && <p>{t("vatId")} {impressum.vatId}</p>}
    </main>
  );
}
