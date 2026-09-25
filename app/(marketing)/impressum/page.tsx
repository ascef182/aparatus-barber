import { getLocale } from "next-intl/server";
import { LegalPage } from "../legal-page";

/**
 * Dados da Empresa — até 2026-09-24 esta página era um Impressum nos
 * termos da lei alemã (§5 TMG/§18 MStV), obrigatório porque o mercado
 * então-alvo era a Alemanha. Com o pivô para o Brasil (ver PRODUCT.md),
 * não existe exigência legal equivalente — mantida como página de
 * transparência de empresa (CNPJ, endereço, contato), não como Impressum.
 * Dados reais da CazaTech (CNPJ 34.496.827/0001-50), fornecidos pela
 * responsável em 2026-08-03. Endereço sem CEP — completar se disponível.
 * ATENÇÃO: conteúdo legal, revisar com advogado antes de tratar como
 * definitivo (ver docs/marketing/plan.md §13).
 */
export default async function ImpressumPage() {
  const locale = await getLocale();
  const isEn = locale === "en";
  const isPt = locale === "pt";

  return (
    <LegalPage title={isEn ? "Company Information" : isPt ? "Dados da Empresa" : "Firmendaten"}>
      <section>
        <h2>{isEn ? "Company" : isPt ? "Empresa" : "Unternehmen"}</h2>
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
        <h2>{isEn ? "Company registration" : isPt ? "Registro da empresa" : "Firmenregistrierung"}</h2>
        <p>
          {isEn
            ? "CazaTech is registered in Brazil under CNPJ 34.496.827/0001-50."
            : isPt
              ? "A CazaTech é registrada no Brasil sob o CNPJ 34.496.827/0001-50."
              : "CazaTech ist in Brasilien unter der CNPJ 34.496.827/0001-50 registriert."}
        </p>
      </section>
    </LegalPage>
  );
}
