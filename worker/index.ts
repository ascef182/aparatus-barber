import * as Sentry from "@sentry/node";
import { Worker } from "bullmq";
import { Resend } from "resend";
import { getBookingForNotification, expireStaleHolds } from "@/lib/services/booking-service";
import { getQuoteRequestForNotification } from "@/lib/services/quote-request-service";
import { getOwnerEmail } from "@/lib/services/member-service";
import { buildNotificationEmail, enqueueBookingNotification, scheduleStaleHoldSweep } from "@/lib/notifications";
import type { BookingNotificationJob, InvitationNotificationJob, QuoteRequestNotificationJob } from "@/lib/notifications";
import { getEmailTranslator } from "@/lib/email-translations";
import { renderBrandedEmail } from "@/lib/email-template";
import { logger } from "@/lib/logger";

// Processo separado do web — precisa do próprio Sentry.init (não passa
// pela instrumentação do Next.js). dsn ausente = no-op seguro.
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const from = process.env.EMAIL_FROM ?? "Bladiq <bookings@bladiq.com>";

// Sem listener de 'error', um evento 'error' emitido pela conexão Redis
// subjacente (ex.: blip de rede num Redis gerenciado) derruba o processo
// inteiro -- EventEmitter relança 'error' sem handler registrado. Um
// handler aqui vira só log+Sentry, deixando o worker de pé.
function logWorkerError(queueName: string) {
  return (err: Error) => {
    logger({ queue: queueName }).error({ err }, "worker.connection_error");
    Sentry.captureException(err, { extra: { queue: queueName } });
  };
}
// Construído sob demanda: o Resend SDK lança no construtor se a API key
// estiver ausente/vazia, o que derrubaria o worker inteiro no boot.
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const notificationsWorker = new Worker<BookingNotificationJob>("booking-notifications", async (job) => {
  const booking = await getBookingForNotification(job.data.bookingId);
  if (!booking) return;
  const email = buildNotificationEmail(job.data, booking);
  if (!email) return;
  await getResend().emails.send({ from, ...email });
}, { connection, concurrency: 10 });

notificationsWorker.on("completed", (job) => {
  logger({ jobId: job.id, queue: "booking-notifications", attemptNumber: job.attemptsMade }).info({}, "job.completed");
});
notificationsWorker.on("failed", (job, err) => {
  logger({ jobId: job?.id, queue: "booking-notifications", attemptNumber: job?.attemptsMade }).error({ err }, "job.failed");
  Sentry.captureException(err);
});
notificationsWorker.on("error", logWorkerError("booking-notifications"));

const maintenanceWorker = new Worker("booking-maintenance", async () => {
  const expiredIds = await expireStaleHolds();
  for (const bookingId of expiredIds) {
    await enqueueBookingNotification({ bookingId, type: "expired" });
  }
}, { connection, concurrency: 1 });

maintenanceWorker.on("failed", (job, err) => {
  logger({ jobId: job?.id, queue: "booking-maintenance", attemptNumber: job?.attemptsMade }).error({ err }, "job.failed");
  Sentry.captureException(err);
});
maintenanceWorker.on("error", logWorkerError("booking-maintenance"));

const invitationsWorker = new Worker<InvitationNotificationJob>("invitation-notifications", async (job) => {
  const t = getEmailTranslator(job.data.locale);
  const vars = { organization: job.data.organizationName };
  const { html, text } = renderBrandedEmail({
    preheader: t("invitation.heading"),
    heading: t("invitation.heading"),
    paragraphs: [t("invitation.body", vars)],
    ctaLabel: t("invitation.cta"),
    ctaUrl: job.data.inviteUrl,
    footerNote: t("footer", vars),
  });
  await getResend().emails.send({
    from,
    to: job.data.email,
    subject: t("invitation.subject", vars),
    html,
    text,
  });
}, { connection, concurrency: 10 });

invitationsWorker.on("failed", (job, err) => {
  logger({ jobId: job?.id, queue: "invitation-notifications", attemptNumber: job?.attemptsMade }).error({ err }, "job.failed");
  Sentry.captureException(err);
});
invitationsWorker.on("error", logWorkerError("invitation-notifications"));

const quoteRequestsWorker = new Worker<QuoteRequestNotificationJob>("quote-request-notifications", async (job) => {
  const quoteRequest = await getQuoteRequestForNotification(job.data.quoteRequestId);
  if (!quoteRequest) return;
  const ownerEmail = await getOwnerEmail(quoteRequest.organizationId);
  if (!ownerEmail) return;

  const t = getEmailTranslator(quoteRequest.organization.defaultLocale);
  const contact = [quoteRequest.customerEmail, quoteRequest.customerPhone].filter(Boolean).join(" · ");
  const vars = { name: quoteRequest.customerName, organization: quoteRequest.organization.name, message: quoteRequest.message, contact };
  const { html, text } = renderBrandedEmail({
    preheader: t("quoteRequest.heading"),
    heading: t("quoteRequest.heading"),
    paragraphs: [t("quoteRequest.body", vars)],
    footerNote: t("footer", { organization: quoteRequest.organization.name }),
  });
  await getResend().emails.send({ from, to: ownerEmail, subject: t("quoteRequest.subject", vars), html, text });
}, { connection, concurrency: 10 });

quoteRequestsWorker.on("failed", (job, err) => {
  logger({ jobId: job?.id, queue: "quote-request-notifications", attemptNumber: job?.attemptsMade }).error({ err }, "job.failed");
  Sentry.captureException(err);
});
quoteRequestsWorker.on("error", logWorkerError("quote-request-notifications"));

scheduleStaleHoldSweep();
