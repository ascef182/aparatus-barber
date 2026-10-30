"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { FOUNDER_PLAN, monthlyNoShowLoss } from "@/lib/marketing/offer";
import { Reveal } from "./reveal";

/**
 * Âncora de valor da oferta: o dono vê, com os próprios números, quanto a
 * falta não cobrada custa por mês comparado à mensalidade. Não usa dado de
 * cliente nem média de mercado — só o que a pessoa digita.
 */
export function NoShowCalculator() {
  const t = useTranslations("landing.calculator");
  const locale = useLocale();
  const ticketId = useId();
  const noShowsId = useId();
  const [ticket, setTicket] = useState("50");
  const [noShows, setNoShows] = useState("2");

  const loss = monthlyNoShowLoss(Number(ticket), Number(noShows));
  const fee = FOUNDER_PLAN.priceInCents / 100;
  const multiple = Math.floor(loss / fee);
  const brl = new Intl.NumberFormat(locale === "pt" ? "pt-BR" : locale, {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

  return (
    <section
      id="calculator"
      className="border-border bg-background border-t px-6 py-24"
    >
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mt-4">{t("subtitle")}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="border-border bg-card mt-12 grid gap-6 rounded-xl border p-6 shadow-sm md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={ticketId} className="text-muted-foreground">
                {t("ticketLabel")}
              </Label>
              <Input
                id={ticketId}
                type="number"
                inputMode="decimal"
                min={0}
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                className="text-foreground"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={noShowsId} className="text-muted-foreground">
                {t("noShowsLabel")}
              </Label>
              <Input
                id={noShowsId}
                type="number"
                inputMode="numeric"
                min={0}
                value={noShows}
                onChange={(e) => setNoShows(e.target.value)}
                className="text-foreground"
              />
            </div>
            <div className="md:col-span-2" aria-live="polite">
              <p className="text-muted-foreground text-sm">
                {t("resultLabel")}
              </p>
              <p className="text-foreground mt-1 text-4xl font-semibold">
                {brl.format(loss)}
                <span className="text-muted-foreground text-base font-normal">
                  {t("perMonth")}
                </span>
              </p>
              {multiple >= 1 && (
                <p className="text-foreground mt-3 text-sm font-medium">
                  {t("comparison", { multiple, fee: brl.format(fee) })}
                </p>
              )}
              <p className="text-muted-foreground mt-3 text-xs">
                {t("disclaimer")}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
