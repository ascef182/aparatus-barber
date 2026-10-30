import { getLocale, getTranslations } from "next-intl/server";
import { ShieldCheck, CreditCard, Languages } from "lucide-react";
import { ScrollPreviewHero } from "./scroll-preview-hero";

const TAB_IDS = ["booking", "availability", "payments", "team"] as const;

// Só "booking" tem print real do app por enquanto (public/calendar.png) —
// as outras 3 caem no mockup fiel (ver TabScreen em scroll-preview-hero.tsx),
// montado com peças que espelham a UI real (product-mockup-primitives.tsx),
// não mais ilustração abstrata.
const TAB_SCREENSHOTS: Partial<Record<(typeof TAB_IDS)[number], string>> = {
  booking: "/calendar.png",
};

// Semana de referência fixa (não é um calendário real, só uma âncora pra
// pegar o nome curto do dia no idioma ativo via Intl, sem chave de tradução
// por dia da semana) — segunda a sábado, 6 dias, pra aba "availability".
const WEEKDAY_ANCHOR = new Date(Date.UTC(2024, 0, 1));

export async function Hero() {
  const t = await getTranslations("landing.hero");
  const tMockup = await getTranslations("landing.mockup");
  const tRoles = await getTranslations("roles");
  const locale = await getLocale();

  const tabs = TAB_IDS.map((id) => ({
    id,
    label: t(`tabs.${id}.label`),
    title: t(`tabs.${id}.title`),
    subtitle: t(`tabs.${id}.subtitle`),
    screenshot: TAB_SCREENSHOTS[id],
  }));

  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
  });
  const weekdayLabels = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(WEEKDAY_ANCHOR);
    date.setUTCDate(WEEKDAY_ANCHOR.getUTCDate() + i);
    return weekdayFormatter.format(date);
  });

  return (
    <ScrollPreviewHero
      badge={t("badge")}
      titleLine1={t("titleLine1")}
      titleLine2={t("titleLine2")}
      subtitle={t("subtitle")}
      ctaPrimary={{ label: t("ctaPrimary"), href: "#pricing" }}
      ctaSecondary={{ label: t("ctaSecondary"), href: "#calculator" }}
      trustItems={[
        { icon: <ShieldCheck className="size-4" />, label: t("trustGdpr") },
        { icon: <CreditCard className="size-4" />, label: t("trustStripe") },
        { icon: <Languages className="size-4" />, label: t("trustLanguages") },
      ]}
      tabs={tabs}
      weekdayLabels={weekdayLabels}
      mockupLabels={{
        servicePlaceholder: tMockup("servicePlaceholder"),
        depositLabel: tMockup("depositLabel"),
        statusConfirmed: tMockup("statusConfirmed"),
      }}
      teamRoles={[
        tRoles("manager"),
        tRoles("professional"),
        tRoles("receptionist"),
      ]}
    />
  );
}
