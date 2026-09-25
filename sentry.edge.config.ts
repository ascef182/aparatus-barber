import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent } from "@/lib/error-sanitizer";
import { classifyError } from "@/lib/error-taxonomy";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend: (event, hint) => {
    event.tags = { ...event.tags, errorCategory: classifyError(hint.originalException) };
    return sanitizeSentryEvent(event);
  },
});
