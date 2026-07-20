import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";

/**
 * Logger estruturado (JSON) — nunca logar PII do cliente (nome, e-mail,
 * telefone); apenas IDs (bookingId, customerId, organizationId, userId).
 */
const baseLogger = pino({ level: process.env.LOG_LEVEL ?? "info" });

type RequestContext = {
  requestId: string;
  organizationId?: string;
  userId?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/** Ativado uma vez por request na cadeia de safe-action (lib/safe-action.ts). */
export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/** Logger com requestId/organizationId/userId do contexto ativo já anexados. */
export function logger(extra: Record<string, unknown> = {}) {
  const ctx = requestContextStorage.getStore();
  return baseLogger.child({ ...ctx, ...extra });
}
