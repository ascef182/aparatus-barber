import { headers } from "next/headers";
import Redis from "ioredis";

// maxRetriesPerRequest baixo: sem Redis disponível, um comando falha depois
// de 1 tentativa de reconexão (rejeita a Promise) em vez de enfileirar e
// tentar de novo até o limite padrão do ioredis (20), o que travava
// login/reset por vários segundos. Mantém a fila offline padrão ligada —
// necessária pro lazyConnect funcionar (o primeiro comando dispara a
// conexão inicial e precisa esperar o handshake, não é uma falha real).
// retryStrategy mantém a reconexão em segundo plano (com backoff, até 5s)
// pra voltar sozinho quando o Redis voltar — só o comando em voo falha
// rápido, a conexão não desiste. O rate-limit continua fail-closed
// (decisão deliberada): sem Redis, a tentativa de login/reset é rejeitada,
// não liberada sem limite.
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => Math.min(times * 200, 5000),
});

// Sem handler, cada tentativa de reconexão falha emite um "Unhandled error
// event" no processo Node — com o backoff acima isso ainda seria um log a
// cada poucos segundos enquanto o Redis estiver fora. Loga só a primeira
// falha (silencia as repetições) e reseta quando a conexão volta, pra não
// inundar o console mas também não perder o sinal de que algo está errado.
let loggedRedisError = false;
redis.on("error", (err) => {
  if (!loggedRedisError) {
    console.error("[redis] connection error (further errors suppressed until reconnected):", err.message);
    loggedRedisError = true;
  }
});
redis.on("ready", () => {
  loggedRedisError = false;
});

/**
 * Storage secundário do Better Auth (rate limit + sessão) em Redis — sem
 * isso, o limitador em memória do próprio Better Auth não funciona
 * corretamente com web escalado horizontalmente (cada instância teria seu
 * próprio contador).
 */
export const authSecondaryStorage = {
  get: (key: string) => redis.get(key),
  set: (key: string, value: string, ttl?: number) =>
    ttl ? redis.set(key, value, "EX", ttl) : redis.set(key, value),
  delete: async (key: string) => {
    await redis.del(key);
  },
};

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Janela fixa por chave (ex.: `booking-hold:{ip}:{organizationId}`).
 * INCR+EXPIRE atômicos o suficiente para rate limiting (não precisa de
 * exatidão perfeita sob corrida — é defesa contra abuso, não contabilidade).
 */
export async function checkRateLimit(
  key: string,
  { windowSeconds, max }: { windowSeconds: number; max: number },
): Promise<{ allowed: boolean; remaining: number }> {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  return { allowed: count <= max, remaining: Math.max(0, max - count) };
}
