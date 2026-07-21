import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CrossTenantWriteError,
  getTenantContext,
  MissingTenantContextError,
  type TenantContext,
} from "@/lib/tenant-context";

/**
 * Models cuja tabela tem coluna organizationId e DEVEM ser escopados por
 * tenant. Todo model novo com organizationId entra aqui E na suite de
 * isolamento (tests/tenant-isolation.test.ts) — regra de PR.
 * Member/Invitation ficam de fora: são gerenciados pelo plugin organization
 * do Better Auth, que opera pelo client cru (lib/prisma). Os mesmos 15
 * nomes (em camelCase via @@map) recebem política de RLS no Postgres —
 * ver prisma/migrations/20260720120000_add_rls_policies.
 */
const TENANT_MODELS = new Set([
  "Location",
  "Staff",
  "StaffWorkingHours",
  "StaffAbsence",
  "ClosedPeriod",
  "Service",
  "ServiceImage",
  "StaffService",
  "Customer",
  "Coupon",
  "CouponService",
  "Booking",
  "TenantSettings",
  "AuditLog",
  "TenantImpressum",
]);

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
 * Injeta/valida organizationId em where/data conforme o tipo de operação.
 * Compartilhada entre o client `db` (seção principal) e
 * `runInTenantTransaction` (escritas atômicas multi-modelo).
 */
function scopeArgs(
  model: string,
  operation: string,
  args: unknown,
  organizationId: string,
): unknown {
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
  } else if (operation === "createMany" || operation === "createManyAndReturn") {
    const rows = Array.isArray(a.data) ? a.data : a.data ? [a.data] : [];
    for (const row of rows) {
      assertNoForeignOrgId(row, organizationId, detail);
    }
    a.data = rows.map((row) => ({ ...row, organizationId }));
  }

  // Escritas não podem mover registros de tenant.
  if ((operation === "update" || operation === "updateMany") && !Array.isArray(a.data)) {
    assertNoForeignOrgId(a.data, organizationId, detail);
  }

  return a;
}

/**
 * Client Prisma com escopo de tenant fail-closed, em duas camadas
 * independentes (plano de RLS, seções 2 e 4):
 * - Camada 1 (aplicação): model tenant-scoped + sem contexto -> lança
 *   MissingTenantContextError; contexto "tenant" -> injeta organizationId
 *   em where/data; contexto "platform" -> bypass explícito (SuperAdmin/jobs).
 * - Camada 2 (Postgres): cada operação tenant-scoped roda dentro de
 *   `prisma.$transaction([setConfig, query])` — um batch que garante que o
 *   `set_config` e a query real compartilham a mesma conexão, para que as
 *   políticas de RLS (que leem app.tenant_id/app.bypass_rls via
 *   current_setting) vejam o valor certo. Isso vale mesmo rodando como a
 *   role owner (RLS não é FORCE ainda — ver seção 4.5 do plano); quando a
 *   app passar a conectar como `app_runtime`, essa camada passa a valer
 *   de verdade, sem precisar mudar este arquivo de novo.
 *
 * Limite conhecido: $queryRaw/$executeRaw fora deste arquivo não passam
 * por nenhuma das duas camadas — proibidos fora da camada de serviço por
 * ESLint e revisão.
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
          const setBypass = prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
          const [, result] = await prisma.$transaction([setBypass, query(args)]);
          return result;
        }

        const a = scopeArgs(model, operation, args, ctx.organizationId) as typeof args;
        const setTenant = prisma.$executeRaw`SELECT set_config('app.tenant_id', ${ctx.organizationId}, true), set_config('app.bypass_rls', 'off', true)`;
        const [, result] = await prisma.$transaction([setTenant, query(a)]);
        return result;
      },
    },
  },
});

export type ScopedDb = typeof db;

/**
 * Escrita atômica multi-modelo com escopo de tenant. Sem chamadas
 * existentes hoje — API preparatória para o dia em que um fluxo precisar
 * de várias operações em `TENANT_MODELS` na mesma transação Postgres
 * (ex.: criar Booking e decrementar redemptions de um Coupon juntos).
 *
 * Não usa `prisma.$extends()` porque o client de transação interativa do
 * Prisma (`tx`) não expõe `$extends` — em vez disso, envolve `tx` num
 * Proxy que aplica a mesma injeção de where/data de `scopeArgs` para
 * models em TENANT_MODELS, sem abrir uma segunda transação (já estamos
 * dentro de uma).
 */
export async function runInTenantTransaction<T>(
  fn: (tx: ScopedDb) => Promise<T>,
): Promise<T> {
  const ctx = getTenantContext();
  if (!ctx) {
    throw new MissingTenantContextError("runInTenantTransaction");
  }

  return prisma.$transaction(async (tx) => {
    if (ctx.kind === "tenant") {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${ctx.organizationId}, true), set_config('app.bypass_rls', 'off', true)`;
    } else {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    }

    const scopedTx = buildScopedTransactionClient(tx, ctx);
    return fn(scopedTx);
  });
}

function buildScopedTransactionClient(
  tx: Prisma.TransactionClient,
  ctx: TenantContext,
): ScopedDb {
  return new Proxy(tx, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string" || typeof value !== "object" || value === null) {
        return value;
      }
      const model = prop.charAt(0).toUpperCase() + prop.slice(1);
      if (!TENANT_MODELS.has(model) || ctx.kind !== "tenant") {
        return value;
      }
      const organizationId = ctx.organizationId;
      return new Proxy(value, {
        get(delegateTarget, operation, delegateReceiver) {
          const fn = Reflect.get(delegateTarget, operation, delegateReceiver);
          if (typeof operation !== "string" || typeof fn !== "function") {
            return fn;
          }
          return (args: unknown) =>
            fn.call(delegateTarget, scopeArgs(model, operation, args, organizationId));
        },
      });
    },
  }) as unknown as ScopedDb;
}
