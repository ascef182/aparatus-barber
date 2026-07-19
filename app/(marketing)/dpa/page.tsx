import { getLocale } from "next-intl/server";
import { LegalPage } from "../legal-page";

export default async function DpaPage() {
  const locale = await getLocale();
  const isEn = locale === "en";

  if (isEn) {
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
          <p>Railway (hosting), Stripe (payments), Resend (email). The Controller consents to the use of these subprocessors.</p>
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

  return (
    <LegalPage title="Auftragsverarbeitungsvertrag (AVV)">
      <p>
        Dieser Auftragsverarbeitungsvertrag ist Bestandteil der AGB zwischen dem Mandanten
        (&ldquo;Verantwortlicher&rdquo;) und Bladiq (&ldquo;Auftragsverarbeiter&rdquo;) und gilt, wann immer
        Bladiq personenbezogene Daten der Kunden des Mandanten in dessen Auftrag verarbeitet (Art. 28 DSGVO). Die
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
        <p>Railway (Hosting), Stripe (Zahlungen), Resend (E-Mail). Der Verantwortliche stimmt dem Einsatz dieser Unterauftragsverarbeiter zu.</p>
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
