import { inject } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * PrismaClient apontando para o Postgres efêmero do Testcontainers
 * (migrations já aplicadas pelo global setup).
 */
export function createTestPrismaClient() {
  const adapter = new PrismaPg({ connectionString: inject("databaseUrl") });
  return new PrismaClient({ adapter });
}
