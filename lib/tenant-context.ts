import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Contexto de tenant propagado via AsyncLocalStorage.
 * - "tenant": toda query em model tenant-scoped é filtrada por organizationId.
 * - "platform": bypass explícito para SuperAdmin/jobs de plataforma.
 *
 * Setado exclusivamente pela cadeia de safe-action clients (lib/safe-action.ts)
 * e por helpers de API route — nunca a partir de input do cliente.
 */
export type TenantContext =
  | { kind: "tenant"; organizationId: string }
  | { kind: "platform" };

const storage = new AsyncLocalStorage<TenantContext>();

// IMPORTANTE: o callback é aguardado DENTRO do storage.run. PrismaPromise é
// lazy (executa no await/then) — sem esse await interno, a query rodaria fora
// do contexto e a extension fail-closed lançaria erro.
export function runWithTenant<T>(
  organizationId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(
    { kind: "tenant", organizationId },
    async () => await fn(),
  ) as Promise<T>;
}

/** Escopo cross-tenant explícito (SuperAdmin, webhooks de plataforma, jobs). */
export function runWithPlatformScope<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run(
    { kind: "platform" },
    async () => await fn(),
  ) as Promise<T>;
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function requireTenantId(): string {
  const ctx = storage.getStore();
  if (ctx?.kind !== "tenant") {
    throw new MissingTenantContextError();
  }
  return ctx.organizationId;
}

export class MissingTenantContextError extends Error {
  constructor(detail?: string) {
    super(
      `Query em model tenant-scoped sem contexto de tenant${detail ? ` (${detail})` : ""}. ` +
        "Use runWithTenant/runWithPlatformScope via cadeia de safe-action clients.",
    );
    this.name = "MissingTenantContextError";
  }
}

export class CrossTenantWriteError extends Error {
  constructor(detail: string) {
    super(`Tentativa de escrita cross-tenant bloqueada: ${detail}`);
    this.name = "CrossTenantWriteError";
  }
}
