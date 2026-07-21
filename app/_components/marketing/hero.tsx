import { getTranslations } from "next-intl/server";
import { ShieldCheck, CreditCard, Languages } from "lucide-react";
import { ScrollPreviewHero } from "./scroll-preview-hero";

const TAB_IDS = ["booking", "availability", "payments", "team"] as const;

export async function Hero() {
  const t = await getTranslations("landing.hero");

  const tabs = TAB_IDS.map((id) => ({
    id,
    label: t(`tabs.${id}.label`),
    title: t(`tabs.${id}.title`),
    subtitle: t(`tabs.${id}.subtitle`),
  }));

  return (
    <ScrollPreviewHero
      badge={t("badge")}
      titleLine1={t("titleLine1")}
      titleLine2={t("titleLine2")}
      subtitle={t("subtitle")}
      ctaPrimary={{ label: t("ctaPrimary"), href: "#pricing" }}
      ctaSecondary={{ label: t("ctaSecondary"), href: "#how-it-works" }}
      trustItems={[
        { icon: <ShieldCheck className="size-4" />, label: t("trustGdpr") },
        { icon: <CreditCard className="size-4" />, label: t("trustStripe") },
        { icon: <Languages className="size-4" />, label: t("trustLanguages") },
      ]}
      tabs={tabs}
    />
  );
}
