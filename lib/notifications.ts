import { Queue } from "bullmq";
import * as Sentry from "@sentry/nextjs";
import { getEmailTranslator } from "@/lib/email-translations";
import { renderBrandedEmail } from "@/lib/email-template";
import { buildBookingIcs } from "@/lib/ics";
import { logger } from "@/lib/logger";

export type BookingNotificationJob = {
  bookingId: string;
  type: "confirmation" | "cancellation" | "reminder" | "expired";
};

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

// Sem listener de 'error', um evento 'error' emitido pela conexão Redis
// subjacente (ex.: blip de rede num Redis gerenciado) derruba o processo
// inteiro -- EventEmitter relança 'error' sem handler registrado. Um
// handler aqui vira só log+Sentry, deixando o processo (web) de pé.
function logQueueError(queueName: string) {
  return (err: Error) => {
    logger({ queue: queueName }).error({ err }, "queue.connection_error");
    Sentry.captureException(err, { extra: { queue: queueName } });
  };
}

export const bookingNotifications = new Queue<BookingNotificationJob>("booking-notifications", { connection });
bookingNotifications.on("error", logQueueError("booking-notifications"));

export async function enqueueBookingNotification(job: BookingNotificationJob, delay = 0) {
  // BullMQ rejeita jobId com ":" (separador interno de chave no Redis).
  await bookingNotifications.add(job.type, job, { jobId: `${job.type}-${job.bookingId}`, delay, attempts: 5, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: 500, removeOnFail: 1000 });
}

/**
 * Backstop para holds PENDING_PAYMENT expirados sem webhook do Stripe
 * (sessão nunca aberta, rede caiu, etc.) — job repetível, registrado uma
 * única vez no boot do worker (jobId fixo evita duplicar o schedule).
 */
export const bookingMaintenance = new Queue("booking-maintenance", { connection });
bookingMaintenance.on("error", logQueueError("booking-maintenance"));

export async function scheduleStaleHoldSweep() {
  await bookingMaintenance.add(
    "expire-stale-holds",
    {},
    { jobId: "expire-stale-holds", repeat: { every: 60_000 }, removeOnComplete: 10, removeOnFail: 10 },
  );
}

export type NotificationBooking = {
  id: string;
  status: string;
  startAt: Date;
  endAt: Date;
  customer: { email: string | null; locale: string | null };
  service: { name: string };
  organization: { name: string; defaultLocale: string; timezone: string };
};

export type NotificationEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string; contentType: string }[];
};

export type InvitationNotificationJob = {
  invitationId: string;
  email: string;
  organizationName: string;
  inviteUrl: string;
  /** Locale da organização que convidou (defaultLocale) — o convidado ainda não tem User/locale próprio neste ponto. */
  locale: string;
};

/**
 * Convite de equipe é não-bloqueante (staff não está esperando na tela) e
 * merece retry como as notificações de booking — por isso vai pela mesma
 * infra de fila em vez de um envio síncrono direto (diferente de
 * reset de senha/verificação de e-mail em lib/auth.ts, que são
 * bloqueantes e enviadas inline).
 */
export const invitationNotifications = new Queue<InvitationNotificationJob>("invitation-notifications", { connection });
invitationNotifications.on("error", logQueueError("invitation-notifications"));

export async function enqueueInvitationEmail(job: InvitationNotificationJob) {
  await invitationNotifications.add("invite", job, {
    jobId: `invite-${job.invitationId}`,
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 500,
    removeOnFail: 1000,
  });
}

export type QuoteRequestNotificationJob = { quoteRequestId: string };

/** E-mail pro staff avisando de um novo pedido de orçamento (categorias
 * sem horário fixo, ver lib/business-category.ts) — sem retry agressivo
 * como booking (não é crítico pro fluxo de pagamento), mas ainda merece
 * tentar de novo se o Resend falhar. */
export const quoteRequestNotifications = new Queue<QuoteRequestNotificationJob>("quote-request-notifications", { connection });
quoteRequestNotifications.on("error", logQueueError("quote-request-notifications"));

export async function enqueueQuoteRequestNotification(job: QuoteRequestNotificationJob) {
  await quoteRequestNotifications.add("notify", job, {
    jobId: `quote-request-${job.quoteRequestId}`,
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 500,
    removeOnFail: 1000,
  });
}

/**
 * Varredura periódica (mesmo padrão de scheduleStaleHoldSweep) que avisa
 * owners cujo prazo de graça de 2FA expira em ~24h e ainda não ativaram —
 * job idempotente (jobId fixo), registrado uma vez no boot do worker.
 * A decisão de quem precisa do lembrete (e o registro de "já enviado")
 * fica em lib/services/member-service.ts, não aqui.
 */
export const mfaReminderMaintenance = new Queue("mfa-reminder-maintenance", { connection });
mfaReminderMaintenance.on("error", logQueueError("mfa-reminder-maintenance"));

export async function scheduleMfaReminderSweep() {
  await mfaReminderMaintenance.add(
    "sweep-mfa-reminders",
    {},
    { jobId: "sweep-mfa-reminders", repeat: { every: 60 * 60_000 }, removeOnComplete: 10, removeOnFail: 10 },
  );
}

/**
 * Decide se e o que enviar para um job de notificação — extraído do worker
 * para ser testável sem subir um Worker/Redis real. Retorna null quando a
 * notificação deve ser suprimida (sem e-mail, sem status compatível).
 */
export function buildNotificationEmail(
  job: BookingNotificationJob,
  booking: NotificationBooking,
): NotificationEmail | null {
  if (!booking.customer.email) return null;
  if (job.type === "reminder" && booking.status !== "CONFIRMED") return null;
  if (job.type === "confirmation" && booking.status !== "CONFIRMED") return null;

  const locale = booking.customer.locale ?? booking.organization.defaultLocale;
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: booking.organization.timezone,
  }).format(booking.startAt);

  const t = getEmailTranslator(locale);
  const vars = { service: booking.service.name, organization: booking.organization.name, date };
  const key = `booking.${job.type}` as const;

  const { html, text } = renderBrandedEmail({
    preheader: t(`${key}.heading`),
    heading: t(`${key}.heading`),
    paragraphs: [t(`${key}.body`, vars)],
    footerNote: t("footer", { organization: booking.organization.name }),
  });

  // Anexo .ics só na confirmação — "adicionar ao calendário" é o que faz
  // sentido nesse momento; lembrete/cancelamento não criam/alteram evento.
  const attachments = job.type === "confirmation"
    ? [{
        filename: "reserva.ics",
        content: buildBookingIcs({
          uid: `booking-${booking.id}@bladiq.com`,
          summary: `${booking.service.name} — ${booking.organization.name}`,
          description: t(`${key}.body`, vars),
          location: booking.organization.name,
          startAt: booking.startAt,
          endAt: booking.endAt,
        }),
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
      }]
    : undefined;

  return { to: booking.customer.email, subject: t(`${key}.subject`, vars), html, text, attachments };
}
