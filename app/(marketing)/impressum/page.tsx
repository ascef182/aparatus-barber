import { getLocale } from "next-intl/server";
import { LegalPage } from "../legal-page";

/**
 * Impressum — obrigatório por lei alemã (§5 TMG / §18 MStV) para qualquer
 * site comercial operado a partir da Alemanha. Os campos marcados
 * [PREENCHER] são dados reais da empresa que NÃO podem ser inventados —
 * preencha antes do lançamento. Sem Impressum válido, operar em produção
 * na Alemanha é ilegal.
 */
export default async function ImpressumPage() {
  const locale = await getLocale();
  const isEn = locale === "en";

  return (
    <LegalPage title={isEn ? "Legal Notice (Impressum)" : "Impressum"}>
      <section>
        <h2>{isEn ? "Information according to § 5 TMG" : "Angaben gemäß § 5 TMG"}</h2>
        <p>
          [PREENCHER: Nome legal completo da empresa]
          <br />
          [PREENCHER: Endereço completo — rua, número, código postal, cidade, país]
        </p>
      </section>
      <section>
        <h2>{isEn ? "Represented by" : "Vertreten durch"}</h2>
        <p>[PREENCHER: Nome do(s) responsável(is) legal(is) / Geschäftsführer]</p>
      </section>
      <section>
        <h2>{isEn ? "Contact" : "Kontakt"}</h2>
        <p>
          {isEn ? "Phone" : "Telefon"}: [PREENCHER]
          <br />
          E-Mail: [PREENCHER]
        </p>
      </section>
      <section>
        <h2>{isEn ? "Commercial register" : "Registereintrag"}</h2>
        <p>
          {isEn ? "Entered in the Commercial Register." : "Eintragung im Handelsregister."}
          <br />
          {isEn ? "Registration court" : "Registergericht"}: [PREENCHER]
          <br />
          {isEn ? "Registration number" : "Registernummer"}: [PREENCHER]
        </p>
      </section>
      <section>
        <h2>{isEn ? "VAT ID" : "Umsatzsteuer-ID"}</h2>
        <p>
          {isEn
            ? "VAT identification number according to §27 a of the German VAT Act:"
            : "Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz:"}
          <br />
          [PREENCHER]
        </p>
      </section>
      <section>
        <h2>{isEn ? "Responsible for content" : "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV"}</h2>
        <p>[PREENCHER: Nome e endereço, se diferente do responsável acima]</p>
      </section>
      <section>
        <h2>{isEn ? "Dispute resolution" : "Streitschlichtung"}</h2>
        <p>
          {isEn
            ? "The European Commission provides a platform for online dispute resolution (OS): https://ec.europa.eu/consumers/odr/. We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board."
            : "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."}
        </p>
      </section>
    </LegalPage>
  );
}
