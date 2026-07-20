import { getTranslations } from "next-intl/server";
import { Button } from "@/app/_components/ui/button";

export async function FinalCta() {
  const t = await getTranslations("landing.finalCta");

  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-neutral-950 px-6 py-24 text-center">
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_center,rgba(87,175,120,0.15),transparent_65%)]" aria-hidden />
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{t("title")}</h2>
        <p className="text-neutral-400">{t("subtitle")}</p>
        <Button asChild size="lg">
          <a href="#pricing">{t("cta")}</a>
        </Button>
      </div>
    </section>
  );
}
