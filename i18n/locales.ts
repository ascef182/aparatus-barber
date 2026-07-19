/**
 * Constantes de locale sem nenhuma dependência de next/headers — importável
 * tanto de Server Components (i18n/request.ts) quanto de Client Components
 * (locale-switcher.tsx). i18n/request.ts puxa next/headers e quebra o bundle
 * client se importado diretamente de um "use client".
 */
export const SUPPORTED_LOCALES = ["de", "en", "pt"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "de";
