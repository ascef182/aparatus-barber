import { getLocale } from "next-intl/server";
import { LegalPage } from "../legal-page";

/**
 * Até 2026-09-24 esta política citava só GDPR (Art. 6/27) e retenção GoBD
 * de 10 anos, porque o mercado então-alvo era a Alemanha. Com o pivô para
 * o Brasil (ver PRODUCT.md), a base legal citada passa a ser a LGPD (Lei
 * 13.709/2018) e a exigência de representante na UE (Art. 27 GDPR) deixa
 * de se aplicar — a CazaTech é brasileira, sem a lacuna que esse artigo
 * endereçava. ATENÇÃO: conteúdo legal, revisar com advogado antes de
 * tratar como definitivo (ver docs/marketing/plan.md §13) — em especial o
 * prazo de retenção de registros de agendamento/pagamento abaixo, que não
 * assume mais o prazo fiscal alemão e ainda não tem prazo brasileiro
 * confirmado por um profissional.
 */
export default async function PrivacyPage() {
  const locale = await getLocale();

  if (locale === "en") {
    return (
      <LegalPage title="Privacy Policy">
        <p>Last updated: 2026-09-24.</p>
        <section>
          <h2>1. Who we are</h2>
          <p>
            Bladiq is operated by CazaTech (CNPJ 34.496.827/0001-50), Avenida 9 de Julho 1981, São Paulo, Brazil
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We operate a booking platform used by local businesses
            (&ldquo;tenants&rdquo;) to manage appointments. This policy explains how we process personal data when
            you visit our platform, sign up as a tenant, or book an appointment through a tenant&apos;s page. Full
            company and contact details are listed in our <a href="/impressum">Company Information</a>.
          </p>
        </section>
        <section>
          <h2>2. Data we collect</h2>
          <ul>
            <li>Account data: name, email, hashed password, organization details.</li>
            <li>Booking data: name, email, phone (optional), appointment details, payment status.</li>
            <li>Payment data: processed entirely by Stripe — we never store card numbers.</li>
            <li>Technical data: IP address, request logs (for security and rate limiting), cookies.</li>
            <li>Device fingerprint: collected at sign-up and subscription checkout, for fraud prevention.</li>
            <li>
              Uploaded images: staff photos and business logos or cover images you choose to upload, stored via
              Cloudinary.
            </li>
          </ul>
        </section>
        <section>
          <h2>3. How we use your data and our legal basis (LGPD, Art. 7)</h2>
          <ul>
            <li>To create and manage your booking or subscription — contract performance, Art. 7(V).</li>
            <li>
              To prevent fraud, apply rate limits, and keep the service secure — legitimate interest, Art. 7(IX).
            </li>
            <li>
              To keep tax and payment records — legal/regulatory obligation, Art. 7(II). The exact retention period
              required under Brazilian tax and consumer law is being confirmed with legal counsel; see §4 below.
            </li>
            <li>
              To send marketing emails or set non-essential cookies — consent, Art. 7(I), only where you&apos;ve
              opted in.
            </li>
          </ul>
        </section>
        <section>
          <h2>4. How long we keep data</h2>
          <ul>
            <li>
              Customer personal data (name, email, phone, notes): kept while your account or organization is
              active; anonymized on request or account erasure.
            </li>
            <li>
              Booking and payment records: kept for as long as applicable Brazilian tax and consumer-protection
              obligations require, even after an erasure request — only directly identifying fields are anonymized,
              the underlying records are not deleted. The exact retention period is under legal review; this
              section will be updated once confirmed (previously stated as 10 years under German tax law, which no
              longer applies to this product).
            </li>
            <li>Security and audit logs: kept only as long as needed for the purpose they were collected for.</li>
          </ul>
        </section>
        <section>
          <h2>5. Who we share data with (subprocessors)</h2>
          <ul>
            <li>Railway — application hosting and database.</li>
            <li>Stripe — payment processing.</li>
            <li>Resend — transactional email.</li>
            <li>Cloudinary — storage for images you upload (staff photos, logos).</li>
            <li>Sentry — error tracking used to diagnose bugs; known-sensitive fields are stripped before logging.</li>
            <li>Vercel Analytics — aggregate, cookie-free visitor analytics for our own marketing pages.</li>
            <li>Google — OAuth sign-in, if you choose to use it.</li>
          </ul>
        </section>
        <section>
          <h2>6. International transfers</h2>
          <p>
            Some of our subprocessors may process data outside Brazil. Where that happens, we rely on the
            safeguards those providers offer and on the international-transfer mechanisms recognized by the LGPD
            (e.g. standard contractual clauses). We are working to confirm and document the hosting region for each
            subprocessor; this section will be updated once that review is complete.
          </p>
        </section>
        <section>
          <h2>7. Cookies</h2>
          <p>
            We use only the cookies necessary to keep you signed in and to run the booking flow, plus cookie-free
            aggregate analytics (Vercel Analytics). We do not use third-party advertising or cross-site tracking
            cookies.
          </p>
        </section>
        <section>
          <h2>8. Automated decision-making</h2>
          <p>
            We do not use your personal data for automated decision-making or profiling that produces legal or
            similarly significant effects.
          </p>
        </section>
        <section>
          <h2>9. Your rights (LGPD, Art. 18)</h2>
          <p>
            You may request access, correction, anonymization, or export (portability) of your personal data.
            Erasure and export requests can be made via <code>POST /api/gdpr/erase</code> and{" "}
            <code>GET /api/gdpr/export</code> while signed in (route names kept from before the market pivot, same
            underlying rights under the LGPD), or by contacting us directly. Booking and payment records are
            retained where legally required (see §4) even after an erasure request — only directly identifying
            fields are anonymized. You also have the right to lodge a complaint with the ANPD (Autoridade Nacional
            de Proteção de Dados), Brazil&apos;s data protection authority.
          </p>
        </section>
        <section>
          <h2>10. Contact for data protection matters</h2>
          <p>
            Email: privacy@bladiq.com. CazaTech is established in Brazil (São Paulo), so no foreign-representative
            appointment is required under the LGPD.
          </p>
        </section>
        <section>
          <h2>11. Changes to this policy</h2>
          <p>We may update this policy as the service evolves. We will change the date above when we do.</p>
        </section>
      </LegalPage>
    );
  }

  if (locale === "pt") {
    return (
      <LegalPage title="Política de Privacidade">
        <p>Última atualização: 24.09.2026.</p>
        <section>
          <h2>1. Quem somos</h2>
          <p>
            A Bladiq é operada pela CazaTech (CNPJ 34.496.827/0001-50), Avenida 9 de Julho, 1981, São Paulo, Brasil
            (&ldquo;nós&rdquo;). Operamos uma plataforma de agendamento usada por negócios locais
            (&ldquo;tenants&rdquo;) para gerenciar compromissos. Esta política explica como tratamos dados pessoais
            quando você visita nossa plataforma, se cadastra como tenant, ou agenda um horário pela página de um
            tenant. Os dados completos da empresa estão nos nossos <a href="/impressum">Dados da Empresa</a>.
          </p>
        </section>
        <section>
          <h2>2. Dados que coletamos</h2>
          <ul>
            <li>Dados de conta: nome, e-mail, senha com hash, dados da organização.</li>
            <li>Dados de agendamento: nome, e-mail, telefone (opcional), detalhes do compromisso, status de pagamento.</li>
            <li>Dados de pagamento: processados inteiramente pela Stripe — nunca armazenamos números de cartão.</li>
            <li>Dados técnicos: endereço IP, logs de requisição (para segurança e limitação de taxa), cookies.</li>
            <li>Fingerprint de dispositivo: coletado no cadastro e no checkout da assinatura, para prevenção de fraude.</li>
            <li>
              Imagens enviadas: fotos de equipe e logos ou imagens de capa que você opta por enviar, armazenadas via
              Cloudinary.
            </li>
          </ul>
        </section>
        <section>
          <h2>3. Como usamos seus dados e nossa base legal (LGPD, Art. 7º)</h2>
          <ul>
            <li>Para criar e gerenciar seu agendamento ou assinatura — execução de contrato, Art. 7º, V.</li>
            <li>
              Para prevenir fraude, aplicar limitação de taxa e manter o serviço seguro — legítimo interesse, Art.
              7º, IX.
            </li>
            <li>
              Para manter registros fiscais e de pagamento — cumprimento de obrigação legal/regulatória, Art. 7º,
              II. O prazo exato exigido pela legislação fiscal e consumerista brasileira está em confirmação com
              assessoria jurídica; ver §4 abaixo.
            </li>
            <li>
              Para enviar e-mails de marketing ou definir cookies não essenciais — consentimento, Art. 7º, I, apenas
              quando você autorizar.
            </li>
          </ul>
        </section>
        <section>
          <h2>4. Por quanto tempo mantemos os dados</h2>
          <ul>
            <li>
              Dados pessoais de clientes (nome, e-mail, telefone, notas): mantidos enquanto sua conta ou organização
              estiver ativa; anonimizados mediante solicitação ou apagamento de conta.
            </li>
            <li>
              Registros de agendamento e pagamento: mantidos pelo prazo exigido pelas obrigações fiscais e de defesa
              do consumidor aplicáveis no Brasil, mesmo após um pedido de apagamento — apenas os campos diretamente
              identificáveis são anonimizados, os registros em si não são apagados. O prazo exato está em revisão
              jurídica; esta seção será atualizada assim que confirmado (a versão anterior indicava 10 anos pela lei
              fiscal alemã, que não se aplica mais a este produto).
            </li>
            <li>Logs de segurança e auditoria: mantidos apenas pelo tempo necessário à finalidade para a qual foram coletados.</li>
          </ul>
        </section>
        <section>
          <h2>5. Com quem compartilhamos dados (subprocessadores)</h2>
          <ul>
            <li>Railway — hospedagem da aplicação e banco de dados.</li>
            <li>Stripe — processamento de pagamentos.</li>
            <li>Resend — e-mail transacional.</li>
            <li>Cloudinary — armazenamento de imagens enviadas por você (fotos de equipe, logos).</li>
            <li>Sentry — rastreamento de erros para diagnóstico de bugs; campos sabidamente sensíveis são removidos antes do registro.</li>
            <li>Vercel Analytics — análise agregada de visitantes, sem cookies, das nossas páginas de marketing.</li>
            <li>Google — login via OAuth, caso você opte por usá-lo.</li>
          </ul>
        </section>
        <section>
          <h2>6. Transferência internacional de dados</h2>
          <p>
            Alguns dos nossos subprocessadores podem processar dados fora do Brasil. Quando isso ocorre, contamos
            com as garantias oferecidas por esses provedores e com os mecanismos de transferência internacional
            reconhecidos pela LGPD (ex.: cláusulas contratuais padrão). Estamos trabalhando para confirmar e
            documentar a região de hospedagem de cada subprocessador; esta seção será atualizada assim que essa
            revisão for concluída.
          </p>
        </section>
        <section>
          <h2>7. Cookies</h2>
          <p>
            Usamos apenas os cookies necessários para manter você conectado e operar o fluxo de agendamento, além de
            análise agregada sem cookies (Vercel Analytics). Não usamos cookies de publicidade de terceiros ou
            rastreamento entre sites.
          </p>
        </section>
        <section>
          <h2>8. Decisão automatizada</h2>
          <p>
            Não usamos seus dados pessoais para decisões automatizadas ou perfilamento que produzam efeitos
            jurídicos ou similarmente significativos.
          </p>
        </section>
        <section>
          <h2>9. Seus direitos (LGPD, Art. 18)</h2>
          <p>
            Você pode solicitar acesso, correção, anonimização ou exportação (portabilidade) dos seus dados
            pessoais. Pedidos de apagamento e exportação podem ser feitos via <code>POST /api/gdpr/erase</code> e{" "}
            <code>GET /api/gdpr/export</code> enquanto estiver autenticado (nomes de rota mantidos de antes do
            pivô de mercado, mesmos direitos garantidos agora pela LGPD), ou entrando em contato diretamente
            conosco. Registros de agendamento e pagamento são mantidos quando legalmente exigido (ver §4) mesmo
            após um pedido de apagamento — apenas os campos diretamente identificáveis são anonimizados. Você
            também tem o direito de apresentar reclamação à ANPD (Autoridade Nacional de Proteção de Dados).
          </p>
        </section>
        <section>
          <h2>10. Contato para questões de proteção de dados</h2>
          <p>
            E-mail: privacy@bladiq.com. A CazaTech é estabelecida no Brasil (São Paulo), então não há exigência de
            representante estrangeiro sob a LGPD.
          </p>
        </section>
        <section>
          <h2>11. Alterações a esta política</h2>
          <p>Podemos atualizar esta política conforme o serviço evolui. A data acima será alterada quando isso acontecer.</p>
        </section>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Datenschutzerklärung">
      <p>Stand: 24.09.2026.</p>
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          Bladiq wird betrieben von CazaTech (CNPJ 34.496.827/0001-50), Avenida 9 de Julho 1981, São Paulo,
          Brasilien (&ldquo;wir&rdquo;). Wir betreiben eine Buchungsplattform für lokale Unternehmen
          (&ldquo;Mandanten&rdquo;). Diese Erklärung beschreibt, wie wir personenbezogene Daten verarbeiten, wenn
          Sie unsere Plattform besuchen, sich als Mandant registrieren oder über die Seite eines Mandanten einen
          Termin buchen. Vollständige Unternehmens- und Kontaktdaten finden Sie in unseren{" "}
          <a href="/impressum">Firmendaten</a>.
        </p>
        <p>
          Hinweis: Der Zielmarkt dieses Produkts hat sich zu Brasilien verschoben (siehe PRODUCT.md). Die
          rechtliche Grundlage dieser Erklärung ist entsprechend die brasilianische LGPD (Gesetz 13.709/2018), nicht
          mehr primär die DSGVO — diese deutsche Fassung wird als Referenz gepflegt, ist aber nicht mehr die
          führende Sprachversion für rechtliche Zwecke.
        </p>
      </section>
      <section>
        <h2>2. Erhobene Daten</h2>
        <ul>
          <li>Kontodaten: Name, E-Mail, gehashtes Passwort, Unternehmensdaten.</li>
          <li>Buchungsdaten: Name, E-Mail, Telefon (optional), Termindetails, Zahlungsstatus.</li>
          <li>Zahlungsdaten: vollständig durch Stripe verarbeitet — wir speichern niemals Kartennummern.</li>
          <li>Technische Daten: IP-Adresse, Request-Logs (Sicherheit, Rate-Limiting), Cookies.</li>
          <li>Geräte-Fingerabdruck: erhoben bei Registrierung und Abonnement-Checkout, zur Betrugsprävention.</li>
          <li>
            Hochgeladene Bilder: Mitarbeiterfotos und Firmenlogos oder Titelbilder, die Sie hochladen, gespeichert
            über Cloudinary.
          </li>
        </ul>
      </section>
      <section>
        <h2>3. Wie wir Ihre Daten nutzen und unsere Rechtsgrundlage (LGPD, Art. 7)</h2>
        <ul>
          <li>Zur Erstellung und Verwaltung Ihrer Buchung oder Ihres Abonnements — Vertragserfüllung.</li>
          <li>Zur Betrugsprävention, für Rate-Limiting und Systemsicherheit — berechtigtes Interesse.</li>
          <li>
            Zur Aufbewahrung steuerlich relevanter Unterlagen — rechtliche Verpflichtung. Die genaue
            Aufbewahrungsfrist nach brasilianischem Recht wird derzeit rechtlich geprüft (siehe Abschnitt 4).
          </li>
          <li>Für Marketing-E-Mails oder nicht-essenzielle Cookies — Einwilligung, nur mit Ihrer Zustimmung.</li>
        </ul>
      </section>
      <section>
        <h2>4. Wie lange wir Daten speichern</h2>
        <ul>
          <li>
            Personenbezogene Kundendaten (Name, E-Mail, Telefon, Notizen): solange Ihr Konto oder Ihre Organisation
            aktiv ist; auf Anfrage oder bei Kontolöschung anonymisiert.
          </li>
          <li>
            Buchungs- und Zahlungsdaten: so lange aufbewahrt, wie es die anwendbaren brasilianischen Steuer- und
            Verbraucherschutzpflichten erfordern, auch nach einer Löschanfrage — nur direkt identifizierende Felder
            werden anonymisiert. Die genaue Frist wird derzeit rechtlich geprüft (frühere Fassung: 10 Jahre nach
            deutschem Steuerrecht, gilt für dieses Produkt nicht mehr).
          </li>
          <li>Sicherheits- und Audit-Logs: nur so lange gespeichert, wie es für den Erhebungszweck erforderlich ist.</li>
        </ul>
      </section>
      <section>
        <h2>5. Mit wem wir Daten teilen (Auftragsverarbeiter)</h2>
        <ul>
          <li>Railway — Hosting und Datenbank.</li>
          <li>Stripe — Zahlungsabwicklung.</li>
          <li>Resend — Transaktions-E-Mails.</li>
          <li>Cloudinary — Speicherung hochgeladener Bilder (Mitarbeiterfotos, Logos).</li>
          <li>Sentry — Fehler-Tracking zur Diagnose von Bugs; bekannt sensible Felder werden vor der Protokollierung entfernt.</li>
          <li>Vercel Analytics — aggregierte, cookie-freie Besucheranalyse unserer Marketing-Seiten.</li>
          <li>Google — OAuth-Anmeldung, falls genutzt.</li>
        </ul>
      </section>
      <section>
        <h2>6. Internationale Datenübermittlung</h2>
        <p>
          Einige unserer Auftragsverarbeiter können Daten außerhalb Brasiliens verarbeiten. In diesem Fall
          verlassen wir uns auf die von diesen Anbietern bereitgestellten Garantien und auf die international
          anerkannten Übermittlungsmechanismen der LGPD. Wir arbeiten daran, die Hosting-Region jedes
          Auftragsverarbeiters zu bestätigen und zu dokumentieren; dieser Abschnitt wird nach Abschluss dieser
          Prüfung aktualisiert.
        </p>
      </section>
      <section>
        <h2>7. Cookies</h2>
        <p>
          Wir verwenden nur die Cookies, die für Ihre Anmeldung und den Buchungsablauf notwendig sind, sowie
          cookie-freie aggregierte Analyse (Vercel Analytics). Wir verwenden keine Werbe-Cookies oder
          seitenübergreifendes Tracking Dritter.
        </p>
      </section>
      <section>
        <h2>8. Automatisierte Entscheidungsfindung</h2>
        <p>
          Wir nutzen Ihre personenbezogenen Daten nicht für automatisierte Entscheidungen oder Profiling mit
          rechtlicher oder ähnlich erheblicher Wirkung.
        </p>
      </section>
      <section>
        <h2>9. Ihre Rechte</h2>
        <p>
          Sie können Auskunft, Berichtigung, Anonymisierung oder Export (Portabilität) Ihrer personenbezogenen
          Daten verlangen. Löschungs- und Exportanfragen können über <code>POST /api/gdpr/erase</code> bzw.{" "}
          <code>GET /api/gdpr/export</code> im eingeloggten Zustand gestellt werden (Routennamen aus der Zeit vor
          dem Marktwechsel beibehalten, gleiche Rechte jetzt nach LGPD), oder direkt per Kontakt. Buchungs- und
          Zahlungsdaten werden bei gesetzlicher Pflicht aufbewahrt (siehe Abschnitt 4), auch nach einer
          Löschanfrage — nur direkt identifizierende Felder werden anonymisiert. Sie haben zudem das Recht, sich
          bei der ANPD (brasilianische Datenschutzbehörde) zu beschweren.
        </p>
      </section>
      <section>
        <h2>10. Kontakt in Datenschutzfragen</h2>
        <p>
          E-Mail: privacy@bladiq.com. CazaTech ist in Brasilien (São Paulo) niedergelassen, daher ist nach der LGPD
          keine Benennung eines ausländischen Vertreters erforderlich.
        </p>
      </section>
      <section>
        <h2>11. Änderungen dieser Erklärung</h2>
        <p>Wir können diese Erklärung anpassen, wenn sich der Dienst weiterentwickelt. Das Datum oben wird dann aktualisiert.</p>
      </section>
    </LegalPage>
  );
}
