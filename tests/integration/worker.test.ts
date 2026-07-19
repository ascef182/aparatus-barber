import { describe, expect, test } from "vitest";
import { buildNotificationEmail, bookingNotifications, enqueueBookingNotification } from "@/lib/notifications";
import type { NotificationBooking } from "@/lib/notifications";

function booking(overrides: Partial<NotificationBooking> = {}): NotificationBooking {
  return {
    status: "CONFIRMED",
    startAt: new Date("2026-08-10T09:00:00.000Z"),
    customer: { email: "cliente@example.com", locale: "pt" },
    service: { name: "Corte" },
    organization: { name: "Barbearia X", defaultLocale: "de", timezone: "Europe/Berlin" },
    ...overrides,
  };
}

describe("worker de notificações — construção/supressão de e-mail", () => {
  test("confirmação é enviada quando o booking está CONFIRMED", () => {
    const email = buildNotificationEmail({ bookingId: "b1", type: "confirmation" }, booking());
    expect(email).not.toBeNull();
    expect(email?.subject).toContain("confirmada");
    expect(email?.to).toBe("cliente@example.com");
  });

  test("lembrete respeita o timezone do tenant na formatação do horário", () => {
    const email = buildNotificationEmail(
      { bookingId: "b1", type: "reminder" },
      booking({ organization: { name: "Barbearia X", defaultLocale: "de", timezone: "Europe/Berlin" } }),
    );
    // 09:00 UTC em agosto (CEST, UTC+2) -> 11:00 no tz do tenant.
    expect(email?.text).toContain("11:");
  });

  test("lembrete é suprimido se o booking foi cancelado antes do disparo", () => {
    const email = buildNotificationEmail({ bookingId: "b1", type: "reminder" }, booking({ status: "CANCELLED" }));
    expect(email).toBeNull();
  });

  test("confirmação é suprimida se o booking não está mais CONFIRMED", () => {
    const email = buildNotificationEmail({ bookingId: "b1", type: "confirmation" }, booking({ status: "CANCELLED" }));
    expect(email).toBeNull();
  });

  test("cancelamento e expiração são enviados independente do status atual", () => {
    expect(buildNotificationEmail({ bookingId: "b1", type: "cancellation" }, booking({ status: "CANCELLED" }))).not.toBeNull();
    expect(buildNotificationEmail({ bookingId: "b1", type: "expired" }, booking({ status: "CANCELLED" }))).not.toBeNull();
  });

  test("sem e-mail do cliente, nenhuma notificação é enviada", () => {
    const email = buildNotificationEmail({ bookingId: "b1", type: "confirmation" }, booking({ customer: { email: null, locale: null } }));
    expect(email).toBeNull();
  });

  test("job é enfileirado com retry exponencial e jobId determinístico (dedupe)", async () => {
    const bookingId = `test-${Date.now()}`;
    await enqueueBookingNotification({ bookingId, type: "confirmation" });
    const job = await bookingNotifications.getJob(`confirmation-${bookingId}`);
    expect(job).toBeDefined();
    expect(job?.opts.attempts).toBe(5);
    expect(job?.opts.backoff).toEqual({ type: "exponential", delay: 1000 });
    await job?.remove();
  });
});
