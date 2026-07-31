import { randomUUID } from "node:crypto";
import { describe, expect, test, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";

const { loggerMock, warnSpy } = vi.hoisted(() => {
  const warnSpy = vi.fn();
  const loggerMock = vi.fn(() => ({ warn: warnSpy, error: vi.fn(), info: vi.fn(), debug: vi.fn() }));
  return { loggerMock, warnSpy };
});

vi.mock("@/lib/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/logger")>();
  return { ...actual, logger: loggerMock };
});

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
    // Mais restritivo que sign-in/sign-up: reset de senha confirma
    // existência de conta e dispara e-mail — 1 a cada 5min, não 5 a cada 1min.
    expect(options.rateLimit?.customRules?.["/request-password-reset"]).toEqual({ window: 300, max: 1 });
  });
});

describe("negação de rate limit em /api/auth é logada (app/api/auth/[...all]/route.ts)", () => {
  test("6ª tentativa de sign-in na mesma janela retorna 429 e loga rate_limit.denied com o path e o IP", async () => {
    const { POST } = await import("@/app/api/auth/[...all]/route");
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const req = new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ email: `nobody-${randomUUID()}@example.com`, password: "wrong-password-123" }),
      });
      lastStatus = (await POST(req)).status;
    }

    expect(lastStatus).toBe(429);
    expect(loggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ authPath: "/api/auth/sign-in/email", ip }),
    );
    expect(warnSpy).toHaveBeenCalledWith({}, "rate_limit.denied");
  });

  test("resposta que não é 429 não loga nada", async () => {
    const { GET } = await import("@/app/api/auth/[...all]/route");
    loggerMock.mockClear();
    warnSpy.mockClear();

    const req = new Request("http://localhost:3000/api/auth/get-session", { method: "GET" });
    const res = await GET(req);

    expect(res.status).not.toBe(429);
    expect(loggerMock).not.toHaveBeenCalled();
  });
});
