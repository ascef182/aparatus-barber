import { getLocale } from "next-intl/server";
import { LegalPage } from "../legal-page";

export default async function PrivacyPage() {
  const locale = await getLocale();
  const isEn = locale === "en";

  if (isEn) {
    return (
      <LegalPage title="Privacy Policy">
        <p>Last updated: 2026-07-14.</p>
        <section>
          <h2>1. Who we are</h2>
          <p>
            Aparatus (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a booking platform used by barbershops and salons
            (&ldquo;tenants&rdquo;) to manage appointments. This policy explains how we process personal data when
            you visit our platform, sign up as a tenant, or book an appointment through a tenant&apos;s page.
          </p>
        </section>
        <section>
          <h2>2. Data we collect</h2>
          <ul>
            <li>Account data: name, email, hashed password, organization details.</li>
            <li>Booking data: name, email, phone (optional), appointment details, payment status.</li>
            <li>Payment data: processed entirely by Stripe — we never store card numbers.</li>
            <li>Technical data: IP address, request logs (for security and rate limiting), cookies.</li>
          </ul>
        </section>
        <section>
          <h2>3. Legal basis (Art. 6 GDPR)</h2>
          <ul>
            <li>Contract performance (Art. 6(1)(b)) — creating and managing your booking or subscription.</li>
            <li>Legitimate interest (Art. 6(1)(f)) — fraud prevention, rate limiting, service security.</li>
            <li>Legal obligation (Art. 6(1)(c)) — tax record retention (GoBD, 10 years for payment records).</li>
            <li>Consent (Art. 6(1)(a)) — marketing emails and non-essential cookies.</li>
          </ul>
        </section>
        <section>
          <h2>4. Subprocessors</h2>
          <ul>
            <li>Railway (application hosting, EU region)</li>
            <li>Stripe (payment processing)</li>
            <li>Resend (transactional email)</li>
            <li>Google (OAuth sign-in, if used)</li>
          </ul>
        </section>
        <section>
          <h2>5. Your rights</h2>
          <p>
            You may request access, correction, erasure, or export of your personal data. Erasure and export requests
            can be made via <code>POST /api/gdpr/erase</code> and <code>GET /api/gdpr/export</code> while signed in, or
            by contacting us directly. Booking and payment records are retained for 10 years where legally required
            (GoBD §147 AO) even after an erasure request — only directly identifying fields are anonymized.
          </p>
        </section>
        <section>
          <h2>6. Contact / Data Protection Officer</h2>
          <p>[PREENCHER: contato do DPO ou responsável por proteção de dados]</p>
        </section>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Datenschutzerklärung">
      <p>Stand: 14.07.2026.</p>
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          Aparatus (&ldquo;wir&rdquo;) betreibt eine Buchungsplattform für Barbershops und Salons
          (&ldquo;Mandanten&rdquo;). Diese Erklärung beschreibt, wie wir personenbezogene Daten verarbeiten, wenn Sie
          unsere Plattform besuchen, sich als Mandant registrieren oder über die Seite eines Mandanten einen Termin
          buchen.
        </p>
      </section>
      <section>
        <h2>2. Erhobene Daten</h2>
        <ul>
          <li>Kontodaten: Name, E-Mail, gehashtes Passwort, Unternehmensdaten.</li>
          <li>Buchungsdaten: Name, E-Mail, Telefon (optional), Termindetails, Zahlungsstatus.</li>
          <li>Zahlungsdaten: vollständig durch Stripe verarbeitet — wir speichern niemals Kartennummern.</li>
          <li>Technische Daten: IP-Adresse, Request-Logs (Sicherheit, Rate-Limiting), Cookies.</li>
        </ul>
      </section>
      <section>
        <h2>3. Rechtsgrundlage (Art. 6 DSGVO)</h2>
        <ul>
          <li>Vertragserfüllung (Art. 6 Abs. 1 lit. b) — Buchung/Abonnement.</li>
          <li>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f) — Betrugsprävention, Rate-Limiting, Sicherheit.</li>
          <li>Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c) — steuerliche Aufbewahrung (GoBD, 10 Jahre für Zahlungsdaten).</li>
          <li>Einwilligung (Art. 6 Abs. 1 lit. a) — Marketing-E-Mails und nicht-essenzielle Cookies.</li>
        </ul>
      </section>
      <section>
        <h2>4. Auftragsverarbeiter</h2>
        <ul>
          <li>Railway (Hosting, EU-Region)</li>
          <li>Stripe (Zahlungsabwicklung)</li>
          <li>Resend (Transaktions-E-Mails)</li>
          <li>Google (OAuth-Anmeldung, falls genutzt)</li>
        </ul>
      </section>
      <section>
        <h2>5. Ihre Rechte</h2>
        <p>
          Sie können Auskunft, Berichtigung, Löschung oder Export Ihrer personenbezogenen Daten verlangen. Löschungs-
          und Exportanfragen können über <code>POST /api/gdpr/erase</code> bzw. <code>GET /api/gdpr/export</code> im
          eingeloggten Zustand gestellt werden, oder direkt per Kontakt. Buchungs- und Zahlungsdaten werden bei
          gesetzlicher Pflicht 10 Jahre aufbewahrt (GoBD §147 AO), auch nach einer Löschanfrage — nur direkt
          identifizierende Felder werden anonymisiert.
        </p>
      </section>
      <section>
        <h2>6. Kontakt / Datenschutzbeauftragter</h2>
        <p>[PREENCHER: Kontakt des Datenschutzbeauftragten]</p>
      </section>
    </LegalPage>
  );
}
