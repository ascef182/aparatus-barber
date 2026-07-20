import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";

describe("checkRateLimit (Redis, janela fixa)", () => {
  test("permite até o limite e bloqueia a partir daí", async () => {
    const key = `test:${randomUUID()}`;
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => checkRateLimit(key, { windowSeconds: 60, max: 5 })),
    );
    // As 5 primeiras (dentro do max=5) devem passar; a ordem de resolução de
    // promises concorrentes não é garantida, então checamos a contagem, não
    // uma sequência estrita.
    expect(attempts.filter((a) => a.allowed)).toHaveLength(5);

    const sixth = await checkRateLimit(key, { windowSeconds: 60, max: 5 });
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
  });

  test("chaves diferentes não interferem entre si", async () => {
    const keyA = `test:${randomUUID()}`;
    const keyB = `test:${randomUUID()}`;
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(keyA, { windowSeconds: 60, max: 5 });
    }
    const blockedA = await checkRateLimit(keyA, { windowSeconds: 60, max: 5 });
    const firstB = await checkRateLimit(keyB, { windowSeconds: 60, max: 5 });
    expect(blockedA.allowed).toBe(false);
    expect(firstB.allowed).toBe(true);
  });
});

describe("configuração de rate limit do Better Auth", () => {
  test("login/signup/reset de senha têm limite mais restritivo que o padrão", () => {
    const options = auth.options;
    expect(options.rateLimit?.enabled).toBe(true);
    expect(options.rateLimit?.customRules?.["/sign-in/email"]).toEqual({ window: 60, max: 5 });
    expect(options.rateLimit?.customRules?.["/sign-up/email"]).toEqual({ window: 60, max: 5 });
    expect(options.rateLimit?.customRules?.["/request-password-reset"]).toEqual({ window: 60, max: 5 });
  });
});
