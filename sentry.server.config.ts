import * as Sentry from "@sentry/nextjs";

// Sentry.init com dsn ausente/vazio é um no-op seguro (não lança, não
// envia nada) — diferente do Resend/Stripe, não precisa de lazy-init.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // 401/403/404/429 são esperados (auth, permissão, rota, rate limit) —
  // não são incidentes de produção.
  ignoreErrors: ["Unauthorized", "Sem permissão para esta ação.", "Muitas tentativas"],
});
