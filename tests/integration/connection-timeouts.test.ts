import { Client as PgClient } from "pg";
import Redis from "ioredis";
import { describe, expect, test } from "vitest";

/**
 * Sprint 1 do programa de hardening — valida o MECANISMO por trás de
 * `connectionTimeoutMillis` (lib/prisma.ts) e `connectTimeout`
 * (lib/rate-limit.ts), não apenas confia no comentário do WIP. Confirmado
 * por leitura direta do source instalado:
 *   - pg/pg-pool: `connectionTimeoutMillis` cai pra 0 (SEM timeout) quando
 *     omitido — node_modules/pg/lib/client.js:70,103 e
 *     pg-pool/index.js:198,217,242,248.
 *   - ioredis: `connectTimeout` já tem default de 10000ms mesmo sem passar
 *     nada — node_modules/ioredis/built/redis/RedisOptions.js:9.
 * Os testes abaixo usam um valor pequeno (não os 10s de produção) só pra
 * manter o teste rápido — o que importa é provar que o timeout É
 * respeitado, não replicar o número exato de produção.
 *
 * 203.0.113.1 é TEST-NET-3 (RFC 5737): reservado pra documentação, nunca
 * roteável — pacotes SYN são descartados silenciosamente (sem RST), então
 * sem um timeout explícito o SO só desistiria depois de minutos (retransmit
 * timeout do kernel), exatamente o cenário "connect ETIMEDOUT" do
 * incidente de produção.
 */
const BLACKHOLE_HOST = "203.0.113.1";
const SHORT_TIMEOUT_MS = 500;
const GRACE_MS = 2000; // folga generosa: só provamos que falha rápido, não o milissegundo exato

describe("Postgres connectionTimeoutMillis is honored (pg driver underlying lib/prisma.ts)", () => {
  test("fails within the configured timeout instead of hanging on an unroutable host", async () => {
    const client = new PgClient({
      host: BLACKHOLE_HOST,
      port: 5432,
      user: "postgres",
      password: "postgres",
      database: "postgres",
      connectionTimeoutMillis: SHORT_TIMEOUT_MS,
    });

    const start = Date.now();
    await expect(client.connect()).rejects.toThrow(/timeout/i);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(SHORT_TIMEOUT_MS - 50);
    expect(elapsed).toBeLessThan(SHORT_TIMEOUT_MS + GRACE_MS);
  });

  // Não testamos empiricamente "sem connectionTimeoutMillis trava por muito
  // tempo" — o tempo exato até ECONNREFUSED/timeout num host inalcançável
  // depende de configuração de rede/SO local (varia de segundos a minutos),
  // o que tornaria este teste lento e não-determinístico sem provar nada
  // que a leitura do source já não prove: node_modules/pg/lib/client.js:70
  // mostra `connectionTimeoutMillis || 0`, e o guard em :103 só arma o
  // timer quando esse valor é > 0 — sem o campo, não existe timer nenhum.
});

describe("Redis connectTimeout is honored (ioredis driver underlying lib/rate-limit.ts)", () => {
  test("fails within the configured timeout instead of hanging on an unroutable host", async () => {
    const redis = new Redis({
      host: BLACKHOLE_HOST,
      port: 6379,
      lazyConnect: true,
      connectTimeout: SHORT_TIMEOUT_MS,
      retryStrategy: () => null, // não reconecta pra este teste medir só a 1a tentativa
    });

    const start = Date.now();
    await expect(redis.connect()).rejects.toThrow();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(SHORT_TIMEOUT_MS - 50);
    expect(elapsed).toBeLessThan(SHORT_TIMEOUT_MS + GRACE_MS);

    redis.disconnect();
  });
});
