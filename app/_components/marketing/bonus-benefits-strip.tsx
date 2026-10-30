import { getTranslations } from "next-intl/server";
import {
  CalendarCheck,
  CreditCard,
  Languages,
  Percent,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "./reveal";

/**
 * Tira de benefícios curtos, estilo "Mais benefícios exclusivos" da Trinks —
 * mas cada item aqui é uma restatement de uma afirmação já existente e
 * verificada em outro lugar da landing (ver landing.hero.trust* e
 * pricing.trialNote/featureNoCommission), nunca um dado novo. Nenhuma
 * contagem de clientes/depoimento: a Bladiq ainda não tem clientes reais.
 */
const ITEMS = [
  { key: "trial", icon: CalendarCheck },
  { key: "noCommission", icon: Percent },
  { key: "lgpd", icon: ShieldCheck },
  { key: "stripe", icon: CreditCard },
  { key: "languages", icon: Languages },
] as const;

export async function BonusBenefitsStrip() {
  const t = await getTranslations("landing.bonusBenefits");

  return (
    <section className="border-border bg-muted/40 border-t px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <h2 className="text-foreground text-xl font-semibold">
            {t("title")}
          </h2>
        </Reveal>
        <Reveal
          delay={0.1}
          className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5"
        >
          {ITEMS.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                <Icon className="size-5" aria-hidden />
              </div>
              <p className="text-foreground text-sm font-medium">{t(key)}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
