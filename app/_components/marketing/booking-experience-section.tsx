import { getTranslations } from "next-intl/server";
import { CheckCircle2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { SlotChips } from "./product-mockup-primitives";

/**
 * Como é agendar pelo lado do cliente final — fiel ao fluxo real de
 * app/t/[slug]/service-item.tsx (escolher serviço → escolher horário →
 * confirmar/pagar sinal). O profissional é atribuído pelo horário
 * escolhido no fluxo real, por isso não há uma etapa separada de "escolher
 * profissional" aqui.
 */

const DATE_STRIP = ["12", "13", "14", "15", "16"];
const SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];

export async function BookingExperienceSection() {
  const t = await getTranslations("landing.bookingExperience");
  const tMockup = await getTranslations("landing.mockup");

  return (
    <section
      id="booking-experience"
      className="border-border bg-background border-t px-6 py-24"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mt-4">{t("subtitle")}</p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <Reveal delay={0}>
            <div className="border-border bg-card flex h-full flex-col gap-5 rounded-xl border p-6">
              <div>
                <h3 className="text-foreground font-semibold">
                  {t("step1Title")}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  {t("step1Body")}
                </p>
              </div>
              <div className="bg-muted/60 mt-auto rounded-lg p-3" aria-hidden>
                <p className="text-foreground text-sm font-medium">
                  {tMockup("servicePlaceholder")}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  45 min · R$ 80
                </p>
                <span className="bg-primary text-primary-foreground mt-3 inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium">
                  {tMockup("chooseSlotCta")}
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="border-border bg-card flex h-full flex-col gap-5 rounded-xl border p-6">
              <div>
                <h3 className="text-foreground font-semibold">
                  {t("step2Title")}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  {t("step2Body")}
                </p>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <div className="flex justify-between gap-1.5" aria-hidden>
                  {DATE_STRIP.map((day, i) => (
                    <span
                      key={day}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                        i === 2
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {day}
                    </span>
                  ))}
                </div>
                <SlotChips slots={SLOTS} selectedIndex={3} />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="border-border bg-card flex h-full flex-col gap-5 rounded-xl border p-6">
              <div>
                <h3 className="text-foreground font-semibold">
                  {t("step3Title")}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  {t("step3Body")}
                </p>
              </div>
              <div className="mt-auto flex flex-col gap-2" aria-hidden>
                <div className="bg-muted/60 flex items-center justify-between rounded-lg px-3 py-2.5 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="size-3.5" />
                    {tMockup("depositLabel")}
                  </span>
                  <span className="text-foreground tabular-nums">R$ 20</span>
                </div>
                <div className="bg-primary/10 flex items-center justify-between rounded-lg px-3 py-2.5 text-xs">
                  <span className="text-primary font-medium">
                    {tMockup("statusConfirmed")}
                  </span>
                  <CheckCircle2 className="text-primary size-4" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
