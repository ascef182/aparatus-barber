import { prisma } from "@/lib/prisma";
import {
  CrossTenantWriteError,
  getTenantContext,
  MissingTenantContextError,
} from "@/lib/tenant-context";

/**
 * Models cuja tabela tem coluna organizationId e DEVEM ser escopados por
 * tenant. Cresce na Fase 2 (Staff, Service, Booking, Customer...).
 * Member/Invitation ficam de fora: são gerenciados pelo plugin organization
 * do Better Auth, que opera pelo client cru (lib/prisma).
 */
const TENANT_MODELS = new Set(["Location"]);

// Operações cujo `where` aceita filtro composto (lista não-única).
const WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "updateManyAndReturn",
  "deleteMany",
]);

// Operações com `where` único — Prisma aceita campos extras não-únicos
// junto do campo único (extended where unique).
const UNIQUE_WHERE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "delete",
  "upsert",
]);

type AnyArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
};

function assertNoForeignOrgId(
  value: Record<string, unknown> | undefined,
  organizationId: string,
  detail: string,
) {
  if (
    value &&
    "organizationId" in value &&
    value.organizationId !== organizationId
  ) {
    throw new CrossTenantWriteError(detail);
  }
}

/**
 * Client Prisma com escopo de tenant fail-closed (camada 2 do plano, seção 2):
 * - model tenant-scoped + sem contexto  -> lança MissingTenantContextError
 * - contexto "tenant"                   -> injeta organizationId em where/data
 * - contexto "platform"                 -> bypass explícito (SuperAdmin/jobs)
 *
 * Limite conhecido: $queryRaw/$executeRaw não passam por aqui — proibidos
 * fora da camada de serviço por ESLint e revisão.
 */
export const db = prisma.$extends({
  name: "tenant-scope",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_MODELS.has(model)) {
          return query(args);
        }

        const ctx = getTenantContext();
        if (!ctx) {
          throw new MissingTenantContextError(`${model}.${operation}`);
        }
        if (ctx.kind === "platform") {
          return query(args);
        }

        const organizationId = ctx.organizationId;
        const a = (args ?? {}) as AnyArgs;
        const detail = `${model}.${operation}`;

        if (WHERE_OPS.has(operation)) {
          a.where = { AND: [a.where ?? {}, { organizationId }] };
        } else if (UNIQUE_WHERE_OPS.has(operation)) {
          a.where = { ...a.where, organizationId };
          if (operation === "upsert") {
            assertNoForeignOrgId(a.create, organizationId, detail);
            a.create = { ...a.create, organizationId };
          }
        } else if (operation === "create") {
          const data = a.data as Record<string, unknown> | undefined;
          assertNoForeignOrgId(data, organizationId, detail);
          a.data = { ...data, organizationId };
        } else if (
          operation === "createMany" ||
          operation === "createManyAndReturn"
        ) {
          const rows = Array.isArray(a.data) ? a.data : a.data ? [a.data] : [];
          for (const row of rows) {
            assertNoForeignOrgId(row, organizationId, detail);
          }
          a.data = rows.map((row) => ({ ...row, organizationId }));
        }

        // Escritas não podem mover registros de tenant.
        if (
          (operation === "update" || operation === "updateMany") &&
          !Array.isArray(a.data)
        ) {
          assertNoForeignOrgId(a.data, organizationId, detail);
        }

        return query(a as typeof args);
      },
    },
  },
});

export type ScopedDb = typeof db;
