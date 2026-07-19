import { headers } from "next/headers";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { lazyConnect: true });

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
