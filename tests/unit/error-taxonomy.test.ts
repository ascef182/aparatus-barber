import { describe, expect, test } from "vitest";
import { classifyError } from "@/lib/error-taxonomy";

/**
 * Sprint 5 (hardening), Seção 27 — diferenciar tipos de erro pra alertas.
 * AUTH/AUTHORIZATION/VALIDATION já são distinguidos onde importa: status
 * HTTP (lib/http-errors.ts) nas API routes, e ActionError com mensagens
 * "Unauthorized"/"Sem permissão..." já filtradas do Sentry via
 * `ignoreErrors` (sentry.server.config.ts) — são esperadas, não
 * incidentes. classifyError cobre o que falta: dado um erro que CHEGOU
 * até o Sentry (logo, inesperado), de qual dependência ele provavelmente
 * veio — pra tag de alerta, não pra decisão de negócio.
 *
 * Deliberadamente NÃO tenta distinguir REDIS_ERROR de erro de rede
 * genérico: ioredis e pg emitem os MESMOS códigos de erro Node
 * (ECONNREFUSED/ETIMEDOUT) sem um jeito estrutural confiável de saber
 * qual driver lançou sem acoplar este módulo à forma interna de cada
 * lib — arriscar uma heurística errada (marcar um erro de Postgres como
 * Redis) é pior que não classificar. Documentado como limitação
 * conhecida, não um bug a esconder.
 */
describe("classifyError", () => {
  test("erro de tenant isolation (bug real, nunca esperado) -> TENANT_ISOLATION_ERROR", () => {
    const err = new Error("sem contexto");
    err.name = "MissingTenantContextError";
    expect(classifyError(err)).toBe("TENANT_ISOLATION_ERROR");

    const err2 = new Error("cross-tenant write bloqueado");
    err2.name = "CrossTenantWriteError";
    expect(classifyError(err2)).toBe("TENANT_ISOLATION_ERROR");
  });

  test("erro do Prisma (código P-xxxx) -> DATABASE_ERROR", () => {
    const err = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    expect(classifyError(err)).toBe("DATABASE_ERROR");
  });

  test("erro do SDK do Stripe (campo type StripeXxxError) -> STRIPE_ERROR", () => {
    const err = Object.assign(new Error("Invalid request"), {
      type: "StripeInvalidRequestError",
    });
    expect(classifyError(err)).toBe("STRIPE_ERROR");
  });

  test("erro do Resend (formato de mensagem que o próprio worker usa) -> RESEND_ERROR", () => {
    const err = new Error("Resend rejected notification: domain not verified");
    expect(classifyError(err)).toBe("RESEND_ERROR");
  });

  test("erro genérico sem marcador nenhum -> INTERNAL_ERROR (nunca um chute)", () => {
    expect(classifyError(new Error("something broke"))).toBe("INTERNAL_ERROR");
  });

  test("valor não-Error (throw de string/objeto solto) -> INTERNAL_ERROR, nunca lança", () => {
    expect(classifyError("plain string")).toBe("INTERNAL_ERROR");
    expect(classifyError(null)).toBe("INTERNAL_ERROR");
    expect(classifyError(undefined)).toBe("INTERNAL_ERROR");
  });
});
