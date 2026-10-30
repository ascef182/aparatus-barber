import { describe, expect, test } from "vitest";
import type { ErrorEvent as SentryErrorEvent } from "@sentry/nextjs";
import {
  sanitizeErrorContext,
  sanitizeErrorMessage,
  sanitizeSentryEvent,
} from "@/lib/error-sanitizer";

// beforeSend sempre recebe um ErrorEvent completo de verdade; aqui só
// fabricamos os campos relevantes pra cada teste — cast explícito em vez
// de forçar cada fixture a preencher o objeto inteiro.
function fakeEvent(partial: Partial<SentryErrorEvent>): SentryErrorEvent {
  return partial as SentryErrorEvent;
}

describe("sanitizeErrorMessage (cobertura pré-existente — sem teste antes da Sprint 5)", () => {
  test("redige e-mail", () => {
    expect(sanitizeErrorMessage("failed for cliente@example.com")).toBe(
      "failed for [EMAIL_REDACTED]",
    );
  });

  test("redige campo sensível nomeado (password/token/cookie/...)", () => {
    expect(sanitizeErrorMessage("invalid password provided")).toContain("[REDACTED]");
    expect(sanitizeErrorMessage("invalid password provided")).not.toContain("password");
  });
});

describe("sanitizeErrorContext (cobertura pré-existente)", () => {
  test("redige valor de chave sensível mesmo aninhada", () => {
    const result = sanitizeErrorContext({ user: { password: "hunter2", name: "ok" } });
    expect((result.user as Record<string, unknown>).password).toBe("[REDACTED]");
    expect((result.user as Record<string, unknown>).name).toBe("ok");
  });
});

/**
 * Sprint 5 (hardening), Seção 25 — nunca enviar password/session
 * cookie/API key/Stripe secret/Authorization header/dado pessoal sensível
 * pro Sentry. sanitizeErrorMessage/sanitizeErrorContext já existiam mas só
 * eram chamadas em 1 dos 13 call sites de Sentry.captureException do
 * projeto (lib/safe-action.ts) — os outros 12 (worker/index.ts,
 * app/(protected)/dashboard/error.tsx, webhooks Stripe, lib/notifications.ts)
 * mandavam o erro cru. sanitizeSentryEvent centraliza isso num beforeSend
 * global (sentry.server.config.ts/sentry.edge.config.ts/
 * instrumentation-client.ts) — cobre todo call site, presente e futuro,
 * em vez de depender de cada um lembrar de sanitizar antes de capturar.
 *
 * NOTA: headers/cookies HTTP (Authorization, Set-Cookie, sessão) já são
 * filtrados por padrão pelo próprio SDK do Sentry (v10, sem
 * `sendDefaultPii: true` — nenhum dos 3 configs do projeto seta isso),
 * confirmado lendo node_modules/@sentry/core...defaultPiiToCollectionOptions.js
 * (cookies/httpHeaders com deny-list quando sendDefaultPii !== true).
 * sanitizeSentryEvent cobre a lacuna que esse filtro NÃO cobre: texto de
 * mensagem de erro, stack, extra/contexts e breadcrumbs — dados de
 * aplicação, não dados de request HTTP.
 */
describe("sanitizeSentryEvent", () => {
  test("sanitiza a mensagem de cada exception.values[]", () => {
    const event = fakeEvent({
      exception: { values: [{ value: "failed to notify cliente@example.com" }] },
    });
    const result = sanitizeSentryEvent(event);
    expect(result.exception!.values![0]!.value).toBe(
      "failed to notify [EMAIL_REDACTED]",
    );
  });

  test("sanitiza event.message", () => {
    const event = fakeEvent({ message: "duplicate key for phone +5511999998888" });
    const result = sanitizeSentryEvent(event);
    expect(result.message).toContain("[PHONE_REDACTED]");
  });

  test("sanitiza event.extra recursivamente", () => {
    const event = fakeEvent({ extra: { context: { email: "a@b.com", bookingId: "b1" } } });
    const result = sanitizeSentryEvent(event);
    const extra = result.extra as { context: { email: string; bookingId: string } };
    expect(extra.context.email).not.toContain("@");
    expect(extra.context.bookingId).toBe("b1"); // preserva dado não sensível
  });

  test("sanitiza mensagem de cada breadcrumb", () => {
    const event = fakeEvent({
      breadcrumbs: [{ message: "sent to cliente@example.com", category: "resend" }],
    });
    const result = sanitizeSentryEvent(event);
    expect(result.breadcrumbs![0]!.message).not.toContain("@");
    expect(result.breadcrumbs![0]!.category).toBe("resend"); // não mexe em campos não sensíveis
  });

  test("nunca lança e nunca derruba o pipeline de envio quando faltam campos (exception/extra/breadcrumbs ausentes)", () => {
    expect(() => sanitizeSentryEvent(fakeEvent({}))).not.toThrow();
    expect(sanitizeSentryEvent(fakeEvent({}))).toEqual({});
  });

  test("preserva event_id, timestamp e outros campos estruturais intactos", () => {
    const event = fakeEvent({ event_id: "abc123", timestamp: 1700000000, level: "error" });
    const result = sanitizeSentryEvent(event);
    expect(result.event_id).toBe("abc123");
    expect(result.timestamp).toBe(1700000000);
    expect(result.level).toBe("error");
  });
});
