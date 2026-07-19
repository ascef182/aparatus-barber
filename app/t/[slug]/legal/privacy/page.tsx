import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getRootDomain } from "@/lib/tenant-host";

/**
 * Privacy da barbearia (tenant) — Aparatus é o processor dos dados de
 * agendamento; referencia a política da plataforma. Impressum por-tenant
 * (dados configuráveis pelo dono) fica para uma fase seguinte — cada
 * barbearia que opera na Alemanha precisa do próprio Impressum com dados
 * reais, que ainda não há UI para preencher.
 */
export default async function TenantPrivacyPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const [organization, locale] = await Promise.all([getOrganizationBySlug(slug), getLocale()]);
  if (!organization) notFound();
  const isEn = locale === "en";

  return (
    <main className="mx-auto max-w-3xl p-8 py-16 text-sm leading-relaxed">
      <h1 className="mb-6 text-2xl font-semibold">{isEn ? "Privacy Notice" : "Datenschutzhinweis"} — {organization.name}</h1>
      <p className="mb-4">
        {isEn
          ? `${organization.name} uses the Aparatus booking platform to manage appointments. Aparatus processes your booking data (name, email, phone, appointment details) as a data processor on behalf of ${organization.name}, under a Data Processing Agreement.`
          : `${organization.name} nutzt die Aparatus-Buchungsplattform zur Terminverwaltung. Aparatus verarbeitet Ihre Buchungsdaten (Name, E-Mail, Telefon, Termindetails) als Auftragsverarbeiter im Auftrag von ${organization.name}, gemäß einem Auftragsverarbeitungsvertrag.`}
      </p>
      <p className="mb-4">
        {isEn
          ? "For details on how the platform processes data, subprocessors, and your rights, see the "
          : "Details zur Datenverarbeitung, Unterauftragsverarbeitern und Ihren Rechten finden Sie in der "}
        <a className="underline" href={`//${getRootDomain()}/privacy`}>
          {isEn ? "platform privacy policy" : "Datenschutzerklärung der Plattform"}
        </a>
        .
      </p>
    </main>
  );
}
