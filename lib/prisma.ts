import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// RUNTIME_DATABASE_URL conecta como a role restrita `app_runtime` (RLS,
// sem BYPASSRLS) -- é o que web e worker usam para toda query em runtime.
// DATABASE_URL continua sendo a role owner, usada só por
// `prisma migrate dev`/`deploy` (precisa de DDL/CREATE POLICY), nunca pelo
// client em runtime. Ver prisma/migrations/20260720120000_add_rls_policies.
const connectionString = `${process.env.RUNTIME_DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
