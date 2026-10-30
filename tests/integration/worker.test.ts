import { describe, expect, test } from "vitest";
import {
  buildNotificationEmail,
  buildNotificationIdempotencyKey,
  bookingNotifications,
  enqueueBookingNotification,
} from "@/lib/notifications";
import type { NotificationBooking } from "@/lib/notifications";
import { renderBrandedEmail } from "@/lib/email-template";

function booking(
  overrides: Partial<NotificationBooking> = {},
): NotificationBooking {
  return {
    id: "b1",
    status: "CONFIRMED",
    startAt: new Date("2026-08-10T09:00:00.000Z"),
    endAt: new Date("2026-08-10T09:30:00.000Z"),
    customer: { email: "cliente@example.com", locale: "pt" },
    service: { name: "Corte" },
    organization: {
      name: "Barbearia X",
      defaultLocale: "de",
      timezone: "Europe/Berlin",
    },
    ...overrides,
  };
}

describe("worker de notificações — construção/supressão de e-mail", () => {
  test("confirmação é enviada quando o booking está CONFIRMED", () => {
    const email = buildNotificationEmail(
      { bookingId: "b1", type: "confirmation" },
      booking(),
    );
    expect(email).not.toBeNull();
    expect(email?.subject).toContain("confirmada");
    expect(email?.to).toBe("cliente@example.com");
  });

  test("lembrete respeita o timezone do tenant na formatação do horário", () => {
    const email = buildNotificationEmail(
      { bookingId: "b1", type: "reminder" },
      booking({
        organization: {
          name: "Barbearia X",
          defaultLocale: "de",
          timezone: "Europe/Berlin",
        },
      }),
    );
    // 09:00 UTC em agosto (CEST, UTC+2) -> 11:00 no tz do tenant.
    expect(email?.text).toContain("11:");
  });

  test("lembrete é suprimido se o booking foi cancelado antes do disparo", () => {
    const email = buildNotificationEmail(
      { bookingId: "b1", type: "reminder" },
      booking({ status: "CANCELLED" }),
    );
    expect(email).toBeNull();
  });

  test("confirmação é suprimida se o booking não está mais CONFIRMED", () => {
    const email = buildNotificationEmail(
      { bookingId: "b1", type: "confirmation" },
      booking({ status: "CANCELLED" }),
    );
    expect(email).toBeNull();
  });

  test("cancelamento e expiração são enviados independente do status atual", () => {
    expect(
      buildNotificationEmail(
        { bookingId: "b1", type: "cancellation" },
        booking({ status: "CANCELLED" }),
      ),
    ).not.toBeNull();
    expect(
      buildNotificationEmail(
        { bookingId: "b1", type: "expired" },
        booking({ status: "CANCELLED" }),
      ),
    ).not.toBeNull();
  });

  test("confirmação anexa um .ics pra adicionar ao calendário", () => {
    const email = buildNotificationEmail(
      { bookingId: "b1", type: "confirmation" },
      booking(),
    );
    expect(email?.attachments).toHaveLength(1);
    expect(email?.attachments?.[0]?.filename).toBe("reserva.ics");
    expect(email?.attachments?.[0]?.content).toContain("BEGIN:VEVENT");
    expect(email?.attachments?.[0]?.content).toContain(
      "UID:booking-b1@bladiq.com",
    );
    expect(email?.attachments?.[0]?.content).toContain(
      "DTSTART:20260810T090000Z",
    );
    expect(email?.attachments?.[0]?.content).toContain(
      "DTEND:20260810T093000Z",
    );
  });

  test("lembrete e cancelamento não anexam .ics", () => {
    const reminder = buildNotificationEmail(
      { bookingId: "b1", type: "reminder" },
      booking(),
    );
    const cancellation = buildNotificationEmail(
      { bookingId: "b1", type: "cancellation" },
      booking({ status: "CANCELLED" }),
    );
    expect(reminder?.attachments).toBeUndefined();
    expect(cancellation?.attachments).toBeUndefined();
  });

  test("sem e-mail do cliente, nenhuma notificação é enviada", () => {
    const email = buildNotificationEmail(
      { bookingId: "b1", type: "confirmation" },
      booking({ customer: { email: null, locale: null } }),
    );
    expect(email).toBeNull();
  });

  test("conteúdo dinâmico é escapado no HTML sem corromper o texto puro", () => {
    const payload = `<img src=x onerror="alert(1)"><a href="https://evil.test">phishing</a>`;
    const email = renderBrandedEmail({
      heading: payload,
      paragraphs: [payload],
      footerNote: payload,
    });
    expect(email.html).not.toContain("<img");
    expect(email.html).not.toContain('<a href="https://evil.test"');
    expect(email.html).toContain("&lt;img");
    expect(email.text).toContain(payload);
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

/**
 * Sprint 4 (hardening), Seção 22 — invariante de notificação: uma
 * confirmação de booking não pode virar 10 e-mails por causa de retry.
 * jobId determinístico (teste acima) evita ENFILEIRAR o mesmo job duas
 * vezes, mas não protege contra o WORKER reprocessar o MESMO job já
 * enfileirado após uma falha (attempts:5 existe justamente pra isso) —
 * se o processo crashar entre o Resend aceitar o envio e o job ser
 * marcado completed no BullMQ, o retry chamaria resend.emails.send() de
 * novo pro mesmo e-mail. sendAndLog (worker/index.ts) não passava
 * idempotencyKey nenhum pro SDK do Resend — exatamente o "Common Mistake
 * #1" documentado pelo próprio Resend ("Retrying without idempotency key").
 * O Resend dedupa server-side por até 24h dado a MESMA chave + MESMO
 * payload — a garantia real vem de lá; nosso trabalho é só gerar uma
 * chave estável e sempre passar a mesma pro mesmo evento lógico.
 */
describe("buildNotificationIdempotencyKey", () => {
  test("é determinística: mesmo tipo+id sempre produz a mesma chave", () => {
    expect(buildNotificationIdempotencyKey("booking.confirmation", "b1")).toBe(
      buildNotificationIdempotencyKey("booking.confirmation", "b1"),
    );
  });

  test("tipos ou ids diferentes produzem chaves diferentes (não suprime notificações legítimas)", () => {
    const a = buildNotificationIdempotencyKey("booking.confirmation", "b1");
    const b = buildNotificationIdempotencyKey("booking.reminder", "b1");
    const c = buildNotificationIdempotencyKey("booking.confirmation", "b2");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
  });

  test("segue o formato recomendado pelo Resend: <event-type>/<entity-id>", () => {
    expect(buildNotificationIdempotencyKey("booking.confirmation", "b1")).toBe(
      "booking.confirmation/b1",
    );
  });
});
