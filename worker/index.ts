import * as Sentry from "@sentry/node";
import { Worker } from "bullmq";
import { Resend } from "resend";
import { getBookingForNotification, expireStaleHolds } from "@/lib/services/booking-service";
import { buildNotificationEmail, enqueueBookingNotification, scheduleStaleHoldSweep } from "@/lib/notifications";
import type { BookingNotificationJob, InvitationNotificationJob } from "@/lib/notifications";
import { logger } from "@/lib/logger";

// Processo separado do web — precisa do próprio Sentry.init (não passa
// pela instrumentação do Next.js). dsn ausente = no-op seguro.
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const from = process.env.EMAIL_FROM ?? "Aparatus <bookings@aparatus.app>";
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

const invitationsWorker = new Worker<InvitationNotificationJob>("invitation-notifications", async (job) => {
  await getResend().emails.send({
    from,
    to: job.data.email,
    subject: `Convite para ${job.data.organizationName} — Aparatus`,
    text: `Você foi convidado para a equipe de ${job.data.organizationName} na Aparatus.\n\nClique para aceitar: ${job.data.inviteUrl}`,
  });
}, { connection, concurrency: 10 });

invitationsWorker.on("failed", (job, err) => {
  logger({ jobId: job?.id, queue: "invitation-notifications", attemptNumber: job?.attemptsMade }).error({ err }, "job.failed");
  Sentry.captureException(err);
});

scheduleStaleHoldSweep();
