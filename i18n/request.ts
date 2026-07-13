import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const SUPPORTED_LOCALES = ["de", "en", "pt"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "de";

function isSupported(locale: string | undefined): locale is AppLocale {
  return !!locale && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/** Primeiro idioma suportado do Accept-Language (parse simples por qualidade). */
function fromAcceptLanguage(header: string | null): AppLocale | undefined {
  if (!header) return undefined;
  const candidates = header
    .split(",")
    .map((part) => part.split(";")[0]!.trim().toLowerCase().slice(0, 2));
  return candidates.find(isSupported);
}

/**
 * Resolução de locale (fundação da Fase 1, sem prefixo de path):
 * cookie NEXT_LOCALE > Accept-Language > "de".
 * Fase 3 insere na cadeia: User.locale e Organization.defaultLocale (por host).
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const headerLocale = fromAcceptLanguage(
    (await headers()).get("accept-language"),
  );
  const locale = isSupported(cookieLocale)
    ? cookieLocale
    : (headerLocale ?? DEFAULT_LOCALE);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
