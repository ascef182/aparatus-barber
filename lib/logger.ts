import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";

/**
 * Logger estruturado (JSON) — nunca logar PII do cliente (nome, e-mail,
 * telefone); apenas IDs (bookingId, customerId, organizationId, userId).
 *
 * Sem LOGTAIL_SOURCE_TOKEN/LOGTAIL_INGESTING_HOST: comportamento igual ao
 * de sempre, só stdout (mesmo padrão do Sentry — dsn ausente = no-op).
 * Com os dois presentes: mesmo stdout (destination 1) SOMADO ao envio pro
 * Better Stack, pra ter log pesquisável com alerta sem perder o que já
 * lê o stdout hoje (Railway). Compartilhado por web e worker — os dois
 * importam este módulo.
 */
const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN;
const logtailHost = process.env.LOGTAIL_INGESTING_HOST;

const baseLogger =
  logtailToken && logtailHost
    ? pino(
        { level: process.env.LOG_LEVEL ?? "info" },
        pino.transport({
          targets: [
            { target: "pino/file", options: { destination: 1 } },
            {
              target: "@logtail/pino",
              options: { sourceToken: logtailToken, options: { endpoint: `https://${logtailHost}` } },
            },
          ],
        }),
      )
    : pino({ level: process.env.LOG_LEVEL ?? "info" });

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
