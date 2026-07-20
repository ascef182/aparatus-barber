"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

const FAQ_KEYS = ["1", "2", "3", "4", "5"] as const;

export function FaqSection() {
  const t = useTranslations("landing.faq");
  const [openKey, setOpenKey] = useState<string | null>(FAQ_KEYS[0]);

  return (
    <section id="faq" className="border-t border-white/10 bg-neutral-950 px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {t("title")}
        </h2>
        <div className="mt-12 flex flex-col divide-y divide-white/10 border-t border-white/10">
          {FAQ_KEYS.map((key) => {
            const isOpen = openKey === key;
            return (
              <div key={key}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-white">{t(`q${key}`)}</span>
                  <ChevronDown className={`size-5 shrink-0 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && <p className="pb-5 text-sm text-neutral-400">{t(`a${key}`)}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
