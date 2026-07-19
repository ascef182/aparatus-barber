import { getTranslations } from "next-intl/server";
import { ShieldCheck, CreditCard, Languages } from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { HeroPreview } from "./hero-preview";

export async function Hero() {
  const t = await getTranslations("landing.hero");

  return (
    <section className="relative overflow-hidden bg-neutral-950 px-6 pt-20 pb-24 text-center">
      <div className="absolute inset-x-0 top-0 -z-10 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(87,175,120,0.18),transparent_60%)]" aria-hidden />
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <Badge variant="outline" className="border-white/15 bg-white/5 text-neutral-300">
          {t("badge")}
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
          {t("titleLine1")}
          <br />
          <span className="text-primary">{t("titleLine2")}</span>
        </h1>
        <p className="max-w-xl text-lg text-neutral-400">{t("subtitle")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <a href="#pricing">{t("ctaPrimary")}</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10">
            <a href="#how-it-works">{t("ctaSecondary")}</a>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-4" />{t("trustGdpr")}</span>
          <span className="flex items-center gap-1.5"><CreditCard className="size-4" />{t("trustStripe")}</span>
          <span className="flex items-center gap-1.5"><Languages className="size-4" />{t("trustLanguages")}</span>
        </div>
      </div>
      <div className="mt-16">
        <HeroPreview previewCaption={t("previewCaption")} />
      </div>
    </section>
  );
}
