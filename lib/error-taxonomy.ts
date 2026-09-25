/**
 * Classifica um erro que chegou ao Sentry (logo, já inesperado — erros
 * esperados como "Unauthorized"/"Sem permissão..." são filtrados antes
 * via `ignoreErrors`, ver sentry.server.config.ts) pra uma categoria útil
 * de alerta. Usado como tag no evento (ver beforeSend nos 3 configs do
 * Sentry), nunca pra decisão de negócio.
 *
 * Deliberadamente conservador: cada categoria abaixo só é atribuída
 * quando existe um marcador ESTRUTURAL confiável (código Prisma, campo
 * `type` do SDK do Stripe, prefixo de mensagem que o próprio código deste
 * projeto controla). Sem marcador reconhecido, cai em INTERNAL_ERROR —
 * nunca um chute. Em particular, não tenta distinguir REDIS_ERROR: ioredis
 * e pg emitem os MESMOS códigos de erro de rede do Node (ECONNREFUSED,
 * ETIMEDOUT) sem um jeito estrutural confiável de saber qual driver
 * lançou sem acoplar este módulo à forma interna de cada lib.
 *
 * Checagem por `error.code`/`error.name` estrutural, não `instanceof` —
 * mesma razão documentada em lib/services/stripe-event-service.ts
 * (claimStripeEvent): o client gerado do Prisma pode ser carregado em
 * módulos diferentes pelo chunking do Turbopack em produção, e aí
 * `instanceof PrismaClientKnownRequestError` falha mesmo pro erro certo.
 */
export type ErrorCategory =
  | "TENANT_ISOLATION_ERROR"
  | "DATABASE_ERROR"
  | "STRIPE_ERROR"
  | "RESEND_ERROR"
  | "INTERNAL_ERROR";

const TENANT_ISOLATION_ERROR_NAMES = new Set([
  "MissingTenantContextError",
  "CrossTenantWriteError",
]);

export function classifyError(error: unknown): ErrorCategory {
  if (!(error instanceof Error)) return "INTERNAL_ERROR";

  if (TENANT_ISOLATION_ERROR_NAMES.has(error.name)) {
    return "TENANT_ISOLATION_ERROR";
  }

  const stripeType = (error as { type?: unknown }).type;
  if (typeof stripeType === "string" && stripeType.startsWith("Stripe")) {
    return "STRIPE_ERROR";
  }

  const prismaCode = (error as { code?: unknown }).code;
  if (typeof prismaCode === "string" && /^P\d{4}$/.test(prismaCode)) {
    return "DATABASE_ERROR";
  }

  // Prefixo definido por nós mesmos em worker/index.ts#sendAndLog — não é
  // um chute sobre a forma interna do SDK do Resend.
  if (error.message.startsWith("Resend rejected notification:")) {
    return "RESEND_ERROR";
  }

  return "INTERNAL_ERROR";
}
