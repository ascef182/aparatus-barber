import { getTranslations } from "next-intl/server";

export async function HowItWorks() {
  const t = await getTranslations("landing.howItWorks");

  return (
    <section id="how-it-works" className="border-t border-white/10 bg-neutral-950 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {t("title")}
        </h2>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {(["step1", "step2", "step3"] as const).map((key) => (
            <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="font-semibold text-white">{t(`${key}Title`)}</h3>
              <p className="mt-2 text-sm text-neutral-400">{t(`${key}Body`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
