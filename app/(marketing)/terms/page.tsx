import { getLocale } from "next-intl/server";
import { LegalPage } from "../legal-page";

export default async function TermsPage() {
  const locale = await getLocale();

  if (locale === "en") {
    return (
      <LegalPage title="Terms of Service">
        <p>Last updated: 2026-08-03.</p>
        <section>
          <h2>1. Service description</h2>
          <p>
            Bladiq is a software-as-a-service booking platform for local businesses (&ldquo;tenants&rdquo;). By
            subscribing to a plan — Starter, Growth, or Pro — a tenant can manage services, staff, and online
            bookings on their own subdomain.
          </p>
        </section>
        <section>
          <h2>2. Subscriptions and billing</h2>
          <p>
            Subscriptions include a 7-day free trial and renew monthly through Stripe. You can change or cancel
            your plan at any time from the Customer Portal. Fees already charged are non-refundable, except where
            the law requires otherwise.
          </p>
        </section>
        <section>
          <h2>3. Tenant responsibilities</h2>
          <p>
            Tenants are responsible for the accuracy of their service listings, pricing, and staff information, and
            for complying with the consumer-protection and data-protection laws that apply in their own
            jurisdiction — including maintaining their own Legal Notice (Impressum) where legally required.
          </p>
        </section>
        <section>
          <h2>4. Acceptable use</h2>
          <p>
            You may not use the platform to create fraudulent bookings, abuse the public booking API, or attempt to
            bypass rate limiting or tenant isolation.
          </p>
        </section>
        <section>
          <h2>5. Liability</h2>
          <p>
            The service is provided &ldquo;as is.&rdquo; To the extent permitted by law, Bladiq is not liable for
            indirect or consequential damages arising from use of the platform.
          </p>
        </section>
        <section>
          <h2>6. Termination</h2>
          <p>
            Either party may terminate the subscription at any time. After termination, booking data is retained
            for the legally required fiscal retention period, even though the account itself is closed.
          </p>
        </section>
      </LegalPage>
    );
  }

  if (locale === "pt") {
    return (
      <LegalPage title="Termos de Serviço">
        <p>Última atualização: 03.08.2026.</p>
        <section>
          <h2>1. Descrição do serviço</h2>
          <p>
            A Bladiq é uma plataforma de agendamento como serviço (SaaS) para negócios locais
            (&ldquo;tenants&rdquo;). Ao assinar um plano — Starter, Growth ou Pro — o tenant pode gerenciar
            serviços, equipe e agendamentos online no seu próprio subdomínio.
          </p>
        </section>
        <section>
          <h2>2. Assinaturas e cobrança</h2>
          <p>
            As assinaturas incluem um período de teste gratuito de 7 dias e renovam mensalmente via Stripe. Você
            pode alterar ou cancelar seu plano a qualquer momento pelo Portal do Cliente. Valores já cobrados não
            são reembolsáveis, exceto quando exigido por lei.
          </p>
        </section>
        <section>
          <h2>3. Responsabilidades do tenant</h2>
          <p>
            Os tenants são responsáveis pela exatidão dos seus serviços, preços e dados da equipe, e por cumprir as
            leis de proteção ao consumidor e de proteção de dados aplicáveis à sua própria jurisdição — incluindo
            manter seu próprio Aviso Legal (Impressum), quando exigido por lei.
          </p>
        </section>
        <section>
          <h2>4. Uso aceitável</h2>
          <p>
            Você não pode usar a plataforma para criar agendamentos fraudulentos, abusar da API pública de
            agendamento, ou tentar contornar a limitação de taxa ou o isolamento entre tenants.
          </p>
        </section>
        <section>
          <h2>5. Responsabilidade</h2>
          <p>
            O serviço é fornecido &ldquo;no estado em que se encontra&rdquo;. Nos limites permitidos por lei, a
            Bladiq não é responsável por danos indiretos ou consequenciais decorrentes do uso da plataforma.
          </p>
        </section>
        <section>
          <h2>6. Rescisão</h2>
          <p>
            Qualquer uma das partes pode encerrar a assinatura a qualquer momento. Após o encerramento, os dados de
            agendamento são mantidos pelo período de retenção fiscal legalmente exigido, mesmo com a conta
            encerrada.
          </p>
        </section>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen">
      <p>Stand: 03.08.2026.</p>
      <section>
        <h2>1. Leistungsbeschreibung</h2>
        <p>
          Bladiq ist eine SaaS-Buchungsplattform für lokale Unternehmen (&ldquo;Mandanten&rdquo;). Mit einem
          Abonnement — Starter, Growth oder Pro — kann ein Mandant Services, Personal und Online-Buchungen auf der
          eigenen Subdomain verwalten.
        </p>
      </section>
      <section>
        <h2>2. Abonnement und Abrechnung</h2>
        <p>
          Abonnements beinhalten eine 7-tägige kostenlose Testphase und verlängern sich monatlich über Stripe. Sie
          können Ihren Plan jederzeit über das Kundenportal ändern oder kündigen. Bereits berechnete Gebühren sind,
          soweit gesetzlich nicht anders vorgeschrieben, nicht erstattungsfähig.
        </p>
      </section>
      <section>
        <h2>3. Pflichten der Mandanten</h2>
        <p>
          Mandanten sind verantwortlich für die Richtigkeit ihrer Leistungsangaben, Preise und Personaldaten sowie
          für die Einhaltung des in ihrer eigenen Rechtsordnung anwendbaren Verbraucher- und Datenschutzrechts —
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
