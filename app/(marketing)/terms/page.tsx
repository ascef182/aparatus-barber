import { getLocale } from "next-intl/server";
import { LegalPage } from "../legal-page";

export default async function TermsPage() {
  const locale = await getLocale();
  const isEn = locale === "en";

  if (isEn) {
    return (
      <LegalPage title="Terms of Service">
        <p>Last updated: 2026-07-14.</p>
        <section>
          <h2>1. Service description</h2>
          <p>
            Bladiq is a SaaS booking platform for barbershops and salons (&ldquo;tenants&rdquo;). Tenants subscribe
            to a plan (Starter, Growth, or Pro) to manage services, staff, and online bookings on their own
            subdomain.
          </p>
        </section>
        <section>
          <h2>2. Subscriptions and billing</h2>
          <p>
            Subscriptions include a 14-day free trial and renew monthly via Stripe. You may cancel or change your
            plan at any time through the Customer Portal. Fees already charged are non-refundable except where
            required by law.
          </p>
        </section>
        <section>
          <h2>3. Tenant responsibilities</h2>
          <p>
            Tenants are responsible for the accuracy of their service listings, pricing, and staff information, and
            for complying with applicable consumer-protection and data-protection law in their own jurisdiction,
            including maintaining their own Impressum where legally required.
          </p>
        </section>
        <section>
          <h2>4. Acceptable use</h2>
          <p>
            You may not use the platform to book fraudulent appointments, abuse the public booking API, or attempt
            to bypass rate limiting or tenant isolation.
          </p>
        </section>
        <section>
          <h2>5. Liability</h2>
          <p>
            The service is provided &ldquo;as is&rdquo;. To the extent permitted by law, Bladiq is not liable for
            indirect or consequential damages arising from use of the platform.
          </p>
        </section>
        <section>
          <h2>6. Termination</h2>
          <p>
            Either party may terminate the subscription at any time. Upon termination, booking data is retained for
            the legally required fiscal retention period even if the account is closed.
          </p>
        </section>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen">
      <p>Stand: 14.07.2026.</p>
      <section>
        <h2>1. Leistungsbeschreibung</h2>
        <p>
          Bladiq ist eine SaaS-Buchungsplattform für Barbershops und Salons (&ldquo;Mandanten&rdquo;). Mandanten
          abonnieren einen Plan (Starter, Growth oder Pro), um Services, Personal und Online-Buchungen auf ihrer
          eigenen Subdomain zu verwalten.
        </p>
      </section>
      <section>
        <h2>2. Abonnement und Abrechnung</h2>
        <p>
          Abonnements beinhalten eine 14-tägige kostenlose Testphase und verlängern sich monatlich über Stripe. Sie
          können Ihren Plan jederzeit über das Kundenportal ändern oder kündigen. Bereits berechnete Gebühren sind,
          soweit gesetzlich nicht anders vorgeschrieben, nicht erstattungsfähig.
        </p>
      </section>
      <section>
        <h2>3. Pflichten der Mandanten</h2>
        <p>
          Mandanten sind verantwortlich für die Richtigkeit ihrer Leistungsangaben, Preise und Personaldaten sowie
          für die Einhaltung des anwendbaren Verbraucher- und Datenschutzrechts in ihrer eigenen Rechtsordnung,
          einschließlich der Pflege eines eigenen Impressums, sofern gesetzlich vorgeschrieben.
        </p>
      </section>
      <section>
        <h2>4. Zulässige Nutzung</h2>
        <p>
          Die Plattform darf nicht für betrügerische Buchungen, Missbrauch der öffentlichen Buchungs-API oder
          Versuche zur Umgehung von Rate-Limiting oder Mandantentrennung genutzt werden.
        </p>
      </section>
      <section>
        <h2>5. Haftung</h2>
        <p>
          Der Dienst wird &ldquo;wie besehen&rdquo; bereitgestellt. Soweit gesetzlich zulässig, haftet Bladiq nicht
          für mittelbare oder Folgeschäden aus der Nutzung der Plattform.
        </p>
      </section>
      <section>
        <h2>6. Kündigung</h2>
        <p>
          Beide Parteien können das Abonnement jederzeit kündigen. Nach Kündigung werden Buchungsdaten für den
          gesetzlich vorgeschriebenen steuerlichen Aufbewahrungszeitraum weiter gespeichert, auch nach
          Kontoschließung.
        </p>
      </section>
    </LegalPage>
  );
}
