import { getTranslations } from "next-intl/server";
import { Reveal } from "./reveal";

export async function HowItWorks() {
  const t = await getTranslations("landing.howItWorks");

  return (
    <section
      id="how-it-works"
      className="border-border bg-background border-t px-6 py-24"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-foreground text-center text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title")}
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {(["step1", "step2", "step3"] as const).map((key, i) => (
            <Reveal key={key} delay={i * 0.1}>
              <div className="border-border bg-card hover:border-primary/30 h-full rounded-xl border p-6 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-md">
                <h3 className="text-foreground font-semibold">
                  {t(`${key}Title`)}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  {t(`${key}Body`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
