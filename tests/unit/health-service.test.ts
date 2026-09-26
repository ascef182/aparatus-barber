import { describe, expect, test } from "vitest";
import { withTimeout } from "@/lib/services/health-service";

/**
 * Sprint 9 (hardening) — achado real de failure injection: `docker stop`
 * no Redis fez `/api/internal/health` travar por mais de 50 segundos SEM
 * NUNCA responder. Causa: `bookingNotifications.getJobCounts(...)` usa a
 * conexão ioredis COMPARTILHADA do BullMQ (lib/notifications.ts), que já
 * estava conectada antes da queda — BullMQ exige `maxRetriesPerRequest:
 * null` nessa conexão (requisito da própria lib pras operações
 * bloqueantes), então comandos novos enviados enquanto desconectado ficam
 * na fila offline do ioredis esperando reconectar, sem nunca rejeitar a
 * Promise. O `.catch()` que já existia na rota nunca disparava — não é
 * que falte tratamento de erro, é que a Promise nunca REJEITA, só nunca
 * resolve. A verificação de Redis (ping) já tinha essa proteção (client
 * descartável com connectTimeout:2000); a de queue depth não tinha
 * nenhuma. Um health check que trava é pior que um que falha rápido: o
 * orquestrador não consegue distinguir "processo travado" de "Redis
 * fora", e pode reiniciar o processo web à toa.
 */
describe("withTimeout", () => {
  test("resolve com o valor real quando a promise resolve antes do timeout", async () => {
    const result = await withTimeout(Promise.resolve("real value"), 1000, "fallback");
    expect(result).toBe("real value");
  });

  test("resolve com o fallback quando a promise NUNCA resolve (trava, como getJobCounts com Redis fora)", async () => {
    const neverResolves = new Promise<string>(() => {});
    const start = Date.now();
    const result = await withTimeout(neverResolves, 200, "fallback");
    const elapsed = Date.now() - start;

    expect(result).toBe("fallback");
    expect(elapsed).toBeLessThan(1000); // nunca espera a promise pendente pra sempre
  });

  test("resolve com o fallback quando a promise rejeita (mesmo comportamento do .catch() anterior)", async () => {
    const result = await withTimeout(Promise.reject(new Error("boom")), 1000, "fallback");
    expect(result).toBe("fallback");
  });
});
