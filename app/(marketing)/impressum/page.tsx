import { getLocale } from "next-intl/server";
import { LegalPage } from "../legal-page";

/**
 * Impressum — obrigatório por lei alemã (§5 TMG / §18 MStV) para qualquer
 * site comercial que mira o mercado alemão. Dados reais da CazaTech (CNPJ
 * 34.496.827/0001-50), fornecidos pela responsável em 2026-08-03. Endereço
 * sem CEP — completar se disponível. O representante Art. 27 GDPR ainda não
 * foi contratado (ver seção correspondente); não inventar isso aqui.
 */
export default async function ImpressumPage() {
  const locale = await getLocale();
  const isEn = locale === "en";
  const isPt = locale === "pt";

  return (
    <LegalPage title={isEn ? "Legal Notice (Impressum)" : isPt ? "Aviso Legal (Impressum)" : "Impressum"}>
      <section>
        <h2>
          {isEn
            ? "Information according to § 5 TMG"
            : isPt
              ? "Dados conforme § 5 TMG (lei alemã de telemídia)"
              : "Angaben gemäß § 5 TMG"}
        </h2>
        <p>
          CazaTech
          <br />
          Avenida 9 de Julho, 1981
          <br />
          {isEn ? "São Paulo, Brazil" : isPt ? "São Paulo, Brasil" : "São Paulo, Brasilien"}
        </p>
      </section>
      <section>
        <h2>{isEn ? "Represented by" : isPt ? "Representada por" : "Vertreten durch"}</h2>
        <p>Pamela Cazarini</p>
      </section>
      <section>
        <h2>{isEn ? "Contact" : isPt ? "Contato" : "Kontakt"}</h2>
        <p>
          {isEn ? "Phone" : isPt ? "Telefone" : "Telefon"}: +55 11 93620-5799
          <br />
          E-Mail: privacy@bladiq.com
        </p>
      </section>
      <section>
        <h2>{isEn ? "Commercial register" : isPt ? "Registro comercial" : "Registereintrag"}</h2>
        <p>
          {isEn
            ? "CazaTech is registered in Brazil under CNPJ 34.496.827/0001-50. There is no entry in the German Handelsregister — Bladiq operates from Brazil, with no establishment in Germany or the EU."
            : isPt
              ? "A CazaTech é registrada no Brasil sob o CNPJ 34.496.827/0001-50. Não há registro no Handelsregister (registro comercial alemão) — a Bladiq opera a partir do Brasil, sem estabelecimento na Alemanha ou na UE."
              : "CazaTech ist in Brasilien unter der CNPJ 34.496.827/0001-50 registriert. Es besteht kein Eintrag im deutschen Handelsregister — Bladiq wird von Brasilien aus betrieben, ohne Niederlassung in Deutschland oder der EU."}
        </p>
      </section>
      <section>
        <h2>{isEn ? "VAT ID" : isPt ? "Número de identificação de IVA (VAT-ID)" : "Umsatzsteuer-ID"}</h2>
        <p>
          {isEn
            ? "CazaTech does not hold a German VAT identification number under § 27a of the German VAT Act, as it operates from Brazil under the CNPJ above."
            : isPt
              ? "A CazaTech não possui número de identificação de IVA alemão nos termos do § 27a UStG, pois opera a partir do Brasil sob o CNPJ acima."
              : "CazaTech verfügt über keine deutsche Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG, da das Unternehmen von Brasilien aus unter der oben genannten CNPJ operiert."}
        </p>
      </section>
      <section>
        <h2>
          {isEn
            ? "Responsible for content"
            : isPt
              ? "Responsável pelo conteúdo (§ 18 Abs. 2 MStV)"
              : "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV"}
        </h2>
        <p>
          Pamela Cazarini,{" "}
          {isEn ? "address as above." : isPt ? "endereço conforme acima." : "Anschrift wie oben."}
        </p>
      </section>
      <section>
        <h2>{isEn ? "EU representative (Art. 27 GDPR)" : isPt ? "Representante na UE (Art. 27 GDPR)" : "EU-Vertreter (Art. 27 DSGVO)"}</h2>
        <p>
          {isEn
            ? "Because CazaTech has no establishment in the European Union, Article 27 GDPR ordinarily requires the appointment of a representative in the EU/EEA. This has not yet been appointed; we are disclosing this openly and will update this notice once a representative is in place."
            : isPt
              ? "Como a CazaTech não possui estabelecimento na União Europeia, o Art. 27 do GDPR normalmente exige a designação de um representante na UE/EEE. Esse representante ainda não foi designado; estamos sinalizando isso abertamente e atualizaremos este aviso assim que um representante for designado."
              : "Da CazaTech keine Niederlassung in der Europäischen Union hat, verlangt Art. 27 DSGVO grundsätzlich die Benennung eines Vertreters in der EU/im EWR. Dieser wurde noch nicht benannt; wir weisen offen darauf hin und aktualisieren diesen Hinweis, sobald ein Vertreter bestellt ist."}
        </p>
      </section>
      <section>
        <h2>{isEn ? "Dispute resolution" : isPt ? "Resolução de disputas" : "Streitschlichtung"}</h2>
        <p>
          {isEn
            ? "The European Commission provides a platform for online dispute resolution (OS): https://ec.europa.eu/consumers/odr/. We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board."
            : isPt
              ? "A Comissão Europeia disponibiliza uma plataforma de resolução online de litígios (OS): https://ec.europa.eu/consumers/odr/. Não estamos dispostos nem obrigados a participar de procedimentos de resolução de disputas perante uma junta de arbitragem de consumo."
              : "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."}
        </p>
      </section>
    </LegalPage>
  );
}
