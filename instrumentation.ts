export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Tags de rota/tenant no evento do Sentry — sem isso, um erro de render
// (ex.: connect ETIMEDOUT de Postgres/Redis durante auth.api.getSession)
// chegava sem forma de filtrar por rota/tenant sem cruzar timestamp com os
// logs do Pino manualmente. O slug do tenant vem só do Host header (nunca
// de cookie/token) — mesma fonte que proxy.ts já usa pra roteamento, então
// não é dado novo sendo exposto, só reaproveitado pra observabilidade.
export async function onRequestError(...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>) {
  const Sentry = await import("@sentry/nextjs");
  const [, request, context] = args;
  const { resolveTenantSlug } = await import("./lib/tenant-host");
  const hostHeader = request.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const tenantSlug = resolveTenantSlug(host ?? null);

  Sentry.withScope((scope) => {
    scope.setTag("route.path", context.routePath);
    scope.setTag("route.type", context.routeType);
    if (tenantSlug) scope.setTag("tenant.slug", tenantSlug);
    Sentry.captureRequestError(...args);
  });
}
