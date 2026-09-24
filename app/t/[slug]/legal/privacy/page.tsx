import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getRootDomain } from "@/lib/tenant-host";

/**
 * Privacy da barbearia (tenant) — Bladiq é o processor dos dados de
 * agendamento; referencia a política da plataforma. Dados legais
 * por-tenant (app/t/[slug]/legal/impressum) ficam disponíveis via
 * dashboard/settings; preenchimento continua obrigatório para bloquear o
 * agendamento público só de filiais alemãs legadas (countryCode "DE"),
 * não mais o default a partir do pivô de mercado pro Brasil.
 */
export default async function TenantPrivacyPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const [organization, locale] = await Promise.all([getOrganizationBySlug(slug), getLocale()]);
  if (!organization) notFound();
  const isEn = locale === "en";
  const isPt = locale === "pt";

  const title = isEn ? "Privacy Notice" : isPt ? "Aviso de Privacidade" : "Datenschutzhinweis";
  const intro = isEn
    ? `${organization.name} uses the Bladiq booking platform to manage appointments. Bladiq processes your booking data (name, email, phone, appointment details) as a data processor on behalf of ${organization.name}, under a Data Processing Agreement.`
    : isPt
      ? `${organization.name} usa a plataforma de agendamento Bladiq para gerenciar compromissos. A Bladiq processa seus dados de agendamento (nome, e-mail, telefone, detalhes do compromisso) como operadora de dados em nome de ${organization.name}, sob um Acordo de Processamento de Dados.`
      : `${organization.name} nutzt die Bladiq-Buchungsplattform zur Terminverwaltung. Bladiq verarbeitet Ihre Buchungsdaten (Name, E-Mail, Telefon, Termindetails) als Auftragsverarbeiter im Auftrag von ${organization.name}, gemäß einem Auftragsverarbeitungsvertrag.`;
  const linkLeadIn = isEn
    ? "For details on how the platform processes data, subprocessors, and your rights, see the "
    : isPt
      ? "Para detalhes sobre como a plataforma processa dados, subprocessadores e seus direitos, veja a "
      : "Details zur Datenverarbeitung, Unterauftragsverarbeitern und Ihren Rechten finden Sie in der ";
  const linkText = isEn
    ? "platform privacy policy"
    : isPt
      ? "política de privacidade da plataforma"
      : "Datenschutzerklärung der Plattform";

  return (
    <main className="mx-auto max-w-3xl p-8 py-16 text-sm leading-relaxed">
      <h1 className="mb-6 text-2xl font-semibold">{title} — {organization.name}</h1>
      <p className="mb-4">{intro}</p>
      <p className="mb-4">
        {linkLeadIn}
        <a className="underline" href={`//${getRootDomain()}/privacy`}>
          {linkText}
        </a>
        .
      </p>
    </main>
  );
}
