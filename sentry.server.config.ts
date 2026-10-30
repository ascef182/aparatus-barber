import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent } from "@/lib/error-sanitizer";
import { classifyError } from "@/lib/error-taxonomy";

// Sentry.init com dsn ausente/vazio é um no-op seguro (não lança, não
// envia nada) — diferente do Resend/Stripe, não precisa de lazy-init.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // 401/403/404/429 são esperados (auth, permissão, rota, rate limit) —
  // não são incidentes de produção.
  ignoreErrors: ["Unauthorized", "Sem permissão para esta ação.", "Muitas tentativas"],
  beforeSend: (event, hint) => {
    // Tag de categoria (Seção 27) antes de sanitizar — sanitizeSentryEvent
    // mexe no texto da mensagem, não na exception original que
    // classifyError precisa inspecionar (hint.originalException).
    event.tags = { ...event.tags, errorCategory: classifyError(hint.originalException) };
    // Cobre todo call site de Sentry.captureException/captureRequestError
    // (só lib/safe-action.ts chamava sanitizeError manualmente antes da
    // Sprint 5) — ver lib/error-sanitizer.ts#sanitizeSentryEvent.
    return sanitizeSentryEvent(event);
  },
});
