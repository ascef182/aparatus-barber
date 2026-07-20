import { Queue } from "bullmq";

export type BookingNotificationJob = {
  bookingId: string;
  type: "confirmation" | "cancellation" | "reminder" | "expired";
};

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
export const bookingNotifications = new Queue<BookingNotificationJob>("booking-notifications", { connection });

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

export async function scheduleStaleHoldSweep() {
  await bookingMaintenance.add(
    "expire-stale-holds",
    {},
    { jobId: "expire-stale-holds", repeat: { every: 60_000 }, removeOnComplete: 10, removeOnFail: 10 },
  );
}

export type NotificationBooking = {
  status: string;
  startAt: Date;
  customer: { email: string | null; locale: string | null };
  service: { name: string };
  organization: { name: string; defaultLocale: string; timezone: string };
};

export type NotificationEmail = { to: string; subject: string; text: string };

export type InvitationNotificationJob = {
  invitationId: string;
  email: string;
  organizationName: string;
  inviteUrl: string;
};

/**
 * Convite de equipe é não-bloqueante (staff não está esperando na tela) e
 * merece retry como as notificações de booking — por isso vai pela mesma
 * infra de fila em vez de um envio síncrono direto (diferente de
 * reset de senha/verificação de e-mail em lib/auth.ts, que são
 * bloqueantes e enviadas inline).
 */
export const invitationNotifications = new Queue<InvitationNotificationJob>("invitation-notifications", { connection });

export async function enqueueInvitationEmail(job: InvitationNotificationJob) {
  await invitationNotifications.add("invite", job, {
    jobId: `invite-${job.invitationId}`,
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 500,
    removeOnFail: 1000,
  });
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
  const start = new Intl.DateTimeFormat(booking.customer.locale ?? booking.organization.defaultLocale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: booking.organization.timezone,
  }).format(booking.startAt);
  const subject =
    job.type === "reminder" ? `Lembrete: ${booking.service.name}`
    : job.type === "cancellation" ? `Reserva cancelada: ${booking.service.name}`
    : job.type === "expired" ? `Reserva expirada: ${booking.service.name}`
    : `Reserva confirmada: ${booking.service.name}`;
  return { to: booking.customer.email, subject, text: `${booking.organization.name}\n${booking.service.name}\n${start}` };
}
