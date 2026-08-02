import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// RUNTIME_DATABASE_URL conecta como a role restrita `app_runtime` (RLS,
// sem BYPASSRLS) -- é o que web e worker usam para toda query em runtime.
// DATABASE_URL continua sendo a role owner, usada só por
// `prisma migrate dev`/`deploy` (precisa de DDL/CREATE POLICY), nunca pelo
// client em runtime. Ver prisma/migrations/20260720120000_add_rls_policies.
const connectionString = `${process.env.RUNTIME_DATABASE_URL}`;

// max acima do default do driver (10): o scoping de tenant (lib/db.ts) abre
// uma mini-transação por operação tenant-scoped (set_config + query, mesma
// conexão, exigido pelas políticas de RLS) — uma página como /dashboard
// dispara facilmente 10+ dessas concorrentemente, e com o pool default
// baixo isso já foi visto estourando o timeout de 5s do $transaction
// batch (P2028) por contenção de conexão, não por query lenta.
const adapter = new PrismaPg({ connectionString, max: 20 });

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Default do Prisma é maxWait=2000ms/timeout=5000ms, aplicado a toda
// $transaction (inclusive a forma em array usada por lib/db.ts pro scoping
// de tenant) — baixo demais quando várias dessas mini-transações disparam
// concorrentemente (ex.: /dashboard chega a 10+ de uma vez, ver
// getDashboardMetrics) e competem por conexão do pool acima. Cada uma
// continua rápida isoladamente; a folga aqui é pra contenção de conexão sob
// carga, não pra query lenta.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    transactionOptions: { maxWait: 10_000, timeout: 10_000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
