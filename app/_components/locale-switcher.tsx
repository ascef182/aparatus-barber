"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { SUPPORTED_LOCALES, type AppLocale } from "@/i18n/locales";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";

// Nome nativo (não traduzido) — um seletor de idioma deve mostrar cada
// opção no próprio idioma, pra ser reconhecível independente do locale
// atual da UI.
const FLAG: Record<AppLocale, string> = { de: "🇩🇪", en: "🇬🇧", pt: "🇵🇹" };
const NATIVE_NAME: Record<AppLocale, string> = { de: "Deutsch", en: "English", pt: "Português" };

function setLocaleCookie(next: AppLocale) {
  document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
}

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();

  function switchTo(next: AppLocale) {
    setLocaleCookie(next);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-neutral-400 transition-colors hover:text-white"
          aria-label={NATIVE_NAME[locale]}
        >
          <span className="text-base leading-none">{FLAG[locale]}</span>
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={(next) => switchTo(next as AppLocale)}>
          {SUPPORTED_LOCALES.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} className="gap-2">
              <span className="text-base leading-none">{FLAG[l]}</span>
              {NATIVE_NAME[l]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
