import { prisma } from "@/lib/prisma";

/**
 * Corre `promise` contra um timeout, devolvendo `fallback` se `promise`
 * não resolver (nem rejeitar) a tempo. Existe especificamente pra
 * conexões ioredis compartilhadas (BullMQ exige `maxRetriesPerRequest:
 * null` nelas) — sem Redis disponível, um comando novo enviado numa
 * conexão dessas fica pendurado na fila offline do ioredis esperando
 * reconectar, sem NUNCA rejeitar; um `.catch()` sozinho não pega isso
 * porque a Promise nunca chega a rejeitar, só nunca resolve. Achado via
 * failure injection real (Sprint 9): /api/internal/health travava
 * indefinidamente com Redis fora, checando profundidade de fila.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

export async function checkDatabaseHealth(): Promise<{ status: "ok" | "error"; latencyMs: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch {
    return { status: "error", latencyMs: Date.now() - start };
  }
}
