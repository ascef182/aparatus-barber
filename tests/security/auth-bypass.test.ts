import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import { authSecondaryStorage } from "@/lib/rate-limit";

/**
 * Bypass de sessão/tenant e assinatura de webhook inválida já são
 * cobertos: `tests/integration/tenant-isolation.test.ts` (fail-closed sem
 * contexto, cross-tenant bloqueado) e `tests/integration/stripe-webhooks.test.ts`
 * (assinatura inválida -> 400). Server actions chamam `next/headers`, que
 * lança fora de um request real do Next — não reproduzível num teste
 * Vitest plano (confirmado empiricamente), então o limite HTTP em si
 * (dashboard sem sessão -> redirect) não é testável aqui sem infra de
 * mock de request que o resto do projeto não usa. Esta suíte cobre o que
 * sobra e é novo: o secondary storage do Better Auth (sessão + rate
 * limit) contra Redis real.
 */
describe("authSecondaryStorage (Redis)", () => {
  test("round-trip get/set/delete", async () => {
    const key = `test:auth-storage:${randomUUID()}`;
    expect(await authSecondaryStorage.get(key)).toBeNull();

    await authSecondaryStorage.set(key, "valor", 60);
    expect(await authSecondaryStorage.get(key)).toBe("valor");

    await authSecondaryStorage.delete(key);
    expect(await authSecondaryStorage.get(key)).toBeNull();
  });

  test("respeita o TTL", async () => {
    const key = `test:auth-storage-ttl:${randomUUID()}`;
    await authSecondaryStorage.set(key, "valor", 1);
    expect(await authSecondaryStorage.get(key)).toBe("valor");
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(await authSecondaryStorage.get(key)).toBeNull();
  });
});
