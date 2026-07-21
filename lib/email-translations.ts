import { createTranslator } from "next-intl";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type AppLocale } from "@/i18n/locales";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";
import de from "@/messages/de.json";

/**
 * Tradutor de e-mail utilizável fora de um request Next.js (worker BullMQ é
 * um processo Node puro, sem next/headers) — mesmas mensagens de
 * messages/*.json, carregadas estaticamente (sem import() dinâmico, que
 * teria comportamento de resolução diferente entre o bundler do Next e o
 * tsx do worker).
 */
const MESSAGES = { en, pt, de } as const satisfies Record<AppLocale, unknown>;

function resolveLocale(locale: string | null | undefined): AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale ?? "")
    ? (locale as AppLocale)
    : DEFAULT_LOCALE;
}

export function getEmailTranslator(locale: string | null | undefined) {
  const resolved = resolveLocale(locale);
  return createTranslator({ locale: resolved, messages: MESSAGES[resolved], namespace: "emails" });
}
