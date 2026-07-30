/**
 * Utility para sanitizar erros antes de serem logados em Sentry.
 * Remove dados sensíveis (PII, queries, headers) que não devem aparecer
 * em relatórios de erro.
 */

// Padrões de campos sensíveis que devem ser redatados
const SENSITIVE_FIELDS = [
  "password",
  "email",
  "phone",
  "creditCard",
  "cardNumber",
  "cvv",
  "ssn",
  "apiKey",
  "apiSecret",
  "token",
  "authorization",
  "cookie",
  "notes",
  "bio",
  "address",
];

const SENSITIVE_PATTERN = new RegExp(
  `\\b(${SENSITIVE_FIELDS.join("|")})\\b`,
  "gi",
);

export function sanitizeErrorMessage(message: string): string {
  if (!message) return message;

  // Remove PII patterns
  return message
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]")
    .replace(/\+?[1-9]\d{1,14}/g, "[PHONE_REDACTED]")
    .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, "[CARD_REDACTED]")
    .replace(SENSITIVE_PATTERN, "[REDACTED]");
}

export function sanitizeErrorContext(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip sensitive fields entirely
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        sanitized[key] = value.map((item: unknown) =>
          typeof item === "object" ? sanitizeErrorContext(item as Record<string, unknown>) : item,
        );
      } else {
        sanitized[key] = sanitizeErrorContext(value as Record<string, unknown>);
      }
    } else if (typeof value === "string") {
      sanitized[key] = sanitizeErrorMessage(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function sanitizeError(error: Error): Error {
  const sanitized = new Error(sanitizeErrorMessage(error.message));
  sanitized.stack = error.stack
    ?.split("\n")
    .map((line) => sanitizeErrorMessage(line))
    .join("\n");
  return sanitized;
}
