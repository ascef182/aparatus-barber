"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { GUARANTEE_DAYS, GUARANTEE_ENABLED } from "@/lib/marketing/offer";
import { Reveal } from "./reveal";

// "8" é a pergunta da garantia — só aparece junto com o bloco da garantia no
// pricing e a cláusula nos Termos (ver lib/marketing/offer.ts).
const FAQ_KEYS = [
  "6",
  "7",
  "1",
  "2",
  "3",
  "4",
  "5",
  ...(GUARANTEE_ENABLED ? (["8"] as const) : []),
] as const;

export function FaqSection() {
  const t = useTranslations("landing.faq");
  const [openKey, setOpenKey] = useState<string | null>(FAQ_KEYS[0]);

  return (
    <section
      id="faq"
      className="border-border bg-background border-t px-6 py-24"
    >
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <h2 className="text-foreground text-center text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title")}
          </h2>
        </Reveal>
        <Reveal
          delay={0.1}
          className="divide-border border-border mt-12 flex flex-col divide-y border-t"
        >
          {FAQ_KEYS.map((key) => {
            const isOpen = openKey === key;
            return (
              <div key={key}>
                <button
                  type="button"
                  className="group flex w-full items-center justify-between gap-4 py-5 text-left"
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  aria-expanded={isOpen}
                >
                  <span className="text-foreground group-hover:text-primary font-medium transition-colors">
                    {t(`q${key}`)}
                  </span>
                  <ChevronDown
                    className={`text-muted-foreground group-hover:text-primary size-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <p className="text-muted-foreground pb-5 text-sm">
                    {t(`a${key}`, { days: GUARANTEE_DAYS })}
                  </p>
                )}
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
