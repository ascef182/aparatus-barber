import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent } from "@/lib/error-sanitizer";
import { classifyError } from "@/lib/error-taxonomy";

// Convenção do Next.js 15+/@sentry/nextjs para o runtime do navegador —
// instrumentation.ts (raiz) cobre só server/edge; NEXT_PUBLIC_ porque roda
// no bundle do cliente. DSN ausente/vazio é um no-op seguro, mesma lógica
// de sentry.server.config.ts/sentry.edge.config.ts.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend: (event, hint) => {
    event.tags = { ...event.tags, errorCategory: classifyError(hint.originalException) };
    return sanitizeSentryEvent(event);
  },
});
