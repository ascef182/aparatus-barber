import { getTranslations } from "next-intl/server";
import { Button } from "@/app/_components/ui/button";
import { Reveal } from "./reveal";

export async function FinalCta() {
  const t = await getTranslations("landing.finalCta");

  return (
    <section className="bg-primary relative overflow-hidden px-6 py-24 text-center">
      <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <h2 className="text-primary-foreground text-3xl font-bold tracking-tight md:text-4xl">
          {t("title")}
        </h2>
        <p className="text-primary-foreground/80">{t("subtitle")}</p>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="shadow-lg shadow-black/20 transition-transform duration-300 hover:-translate-y-0.5"
        >
          <a href="#pricing">{t("cta")}</a>
        </Button>
      </Reveal>
    </section>
  );
}
