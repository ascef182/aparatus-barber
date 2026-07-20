"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { SUPPORTED_LOCALES, type AppLocale } from "@/i18n/locales";

const LABELS: Record<AppLocale, string> = { de: "DE", en: "EN", pt: "PT" };

function setLocaleCookie(next: AppLocale) {
  document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  function switchTo(next: AppLocale) {
    setLocaleCookie(next);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 text-xs text-neutral-400">
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-current={locale === l}
          className={`rounded-md px-2 py-1 transition-colors ${
            locale === l ? "bg-white/10 text-white" : "hover:text-white"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
