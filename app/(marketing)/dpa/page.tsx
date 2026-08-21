import { getLocale } from "next-intl/server";
import { LegalPage } from "../legal-page";

export default async function DpaPage() {
  const locale = await getLocale();

  if (locale === "en") {
    return (
      <LegalPage title="Data Processing Agreement (DPA)">
        <p>
          This Data Processing Agreement forms part of the Terms of Service between the tenant
          (&ldquo;Controller&rdquo;) and Bladiq (&ldquo;Processor&rdquo;) and applies whenever Bladiq processes
          personal data of the Controller&apos;s customers on the Controller&apos;s behalf (Art. 28 GDPR).
          Acceptance is recorded with version, timestamp, IP address, and user agent at signup.
        </p>
        <section>
          <h2>1. Subject and duration</h2>
          <p>
            Processing of customer booking data (name, email, phone, appointment details) for the duration of the
            Controller&apos;s subscription, plus the legally required fiscal retention period thereafter.
          </p>
        </section>
        <section>
          <h2>2. Subprocessors</h2>
          <p>
            Railway (hosting), Stripe (payments), Resend (email), Cloudinary (storage for staff photos and
            business images), Sentry (error tracking — diagnostic data only, sensitive fields stripped before
            logging). The Controller consents to the use of these subprocessors.
          </p>
        </section>
        <section>
          <h2>3. Security measures</h2>
          <p>
            Tenant data is isolated at the database layer (fail-closed row-level scoping); passwords are hashed;
            transport is encrypted (TLS); access to production data is logged.
          </p>
        </section>
        <section>
          <h2>4. Data subject requests</h2>
          <p>
            Bladiq provides self-service erasure and export endpoints for end customers. The Controller must
            forward any data subject request it cannot resolve directly.
          </p>
        </section>
        <section>
          <h2>5. Deletion</h2>
          <p>
            Upon termination, personal data is anonymized; records required for fiscal retention (GoBD §147 AO) are
            kept for 10 years in anonymized/minimized form where required.
          </p>
        </section>
      </LegalPage>
    );
  }

  if (locale === "pt") {
    return (
      <LegalPage title="Acordo de Processamento de Dados (DPA)">
        <p>
          Este Acordo de Processamento de Dados é parte integrante dos Termos de Serviço entre o tenant
          (&ldquo;Controlador&rdquo;) e a Bladiq (&ldquo;Operador&rdquo;) e se aplica sempre que a Bladiq processar
          dados pessoais dos clientes do Controlador em nome deste (Art. 28 GDPR). A aceitação é registrada com
          versão, data/hora, endereço IP e user agent no momento do cadastro.
        </p>
        <section>
          <h2>1. Objeto e duração</h2>
          <p>
            Processamento de dados de agendamento dos clientes (nome, e-mail, telefone, detalhes do compromisso)
            durante a vigência da assinatura do Controlador, mais o período de retenção fiscal legalmente exigido
            após o término.
          </p>
        </section>
        <section>
          <h2>2. Subprocessadores</h2>
          <p>
            Railway (hospedagem), Stripe (pagamentos), Resend (e-mail), Cloudinary (armazenamento de fotos de
            equipe e imagens do negócio), Sentry (rastreamento de erros — apenas dados de diagnóstico, campos
            sensíveis removidos antes do registro). O Controlador consente com o uso desses subprocessadores.
          </p>
        </section>
        <section>
          <h2>3. Medidas de segurança</h2>
          <p>
            Os dados do tenant são isolados na camada de banco de dados (escopo por linha com fail-closed); senhas
            são armazenadas com hash; a transmissão é criptografada (TLS); o acesso a dados de produção é
            registrado.
          </p>
        </section>
        <section>
          <h2>4. Solicitações de titulares de dados</h2>
          <p>
            A Bladiq oferece endpoints de autoatendimento para apagamento e exportação para os clientes finais. O
            Controlador deve encaminhar qualquer solicitação de titular de dados que não conseguir resolver
            diretamente.
          </p>
        </section>
        <section>
          <h2>5. Apagamento</h2>
          <p>
            Ao término do contrato, os dados pessoais são anonimizados; registros exigidos para retenção fiscal
            (GoBD §147 AO) são mantidos por 10 anos em forma anonimizada/minimizada, quando exigido.
          </p>
        </section>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Auftragsverarbeitungsvertrag (AVV)">
      <p>
        Dieser Auftragsverarbeitungsvertrag ist Bestandteil der AGB zwischen dem Mandanten
        (&ldquo;Verantwortlicher&rdquo;) und Bladiq (&ldquo;Auftragsverarbeiter&rdquo;) und gilt, wann immer Bladiq
        personenbezogene Daten der Kunden des Mandanten in dessen Auftrag verarbeitet (Art. 28 DSGVO). Die
        Zustimmung wird bei der Registrierung mit Version, Zeitstempel, IP-Adresse und User-Agent protokolliert.
      </p>
      <section>
        <h2>1. Gegenstand und Dauer</h2>
        <p>
          Verarbeitung von Buchungsdaten der Kunden (Name, E-Mail, Telefon, Termindetails) für die Dauer des
          Abonnements des Verantwortlichen, zuzüglich der gesetzlich vorgeschriebenen steuerlichen
          Aufbewahrungsfrist.
        </p>
      </section>
      <section>
        <h2>2. Unterauftragsverarbeiter</h2>
        <p>
          Railway (Hosting), Stripe (Zahlungen), Resend (E-Mail), Cloudinary (Speicherung von Mitarbeiterfotos und
          Unternehmensbildern), Sentry (Fehler-Tracking — nur Diagnosedaten, sensible Felder werden vor der
          Protokollierung entfernt). Der Verantwortliche stimmt dem Einsatz dieser Unterauftragsverarbeiter zu.
        </p>
      </section>
      <section>
        <h2>3. Sicherheitsmaßnahmen</h2>
        <p>
          Mandantendaten sind auf Datenbankebene isoliert (fail-closed Zeilenebenen-Scoping); Passwörter werden
          gehasht; die Übertragung ist verschlüsselt (TLS); Zugriffe auf Produktionsdaten werden protokolliert.
        </p>
      </section>
      <section>
        <h2>4. Betroffenenanfragen</h2>
        <p>
          Bladiq stellt Selbstbedienungs-Endpunkte für Löschung und Export für Endkunden bereit. Der
          Verantwortliche muss Anfragen, die er nicht direkt lösen kann, weiterleiten.
        </p>
      </section>
      <section>
        <h2>5. Löschung</h2>
        <p>
          Nach Vertragsende werden personenbezogene Daten anonymisiert; für die steuerliche Aufbewahrung
          erforderliche Datensätze (GoBD §147 AO) werden 10 Jahre in anonymisierter/minimierter Form aufbewahrt,
          soweit erforderlich.
        </p>
      </section>
    </LegalPage>
  );
}
