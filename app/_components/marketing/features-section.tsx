import { getTranslations } from "next-intl/server";
import { Store, CalendarCheck, CreditCard, Users, ShieldCheck, FileCheck } from "lucide-react";

const ICONS = [Store, CalendarCheck, CreditCard, Users, ShieldCheck, FileCheck];
const FEATURE_KEYS = ["multiTenant", "booking", "payments", "team", "security", "compliance"] as const;

export async function FeaturesSection() {
  const t = await getTranslations("landing.features");

  return (
    <section id="features" className="bg-neutral-950 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{t("title")}</h2>
          <p className="mt-4 text-neutral-400">{t("subtitle")}</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((key, i) => {
            const Icon = ICONS[i]!;
            return (
              <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-white">{t(`${key}Title`)}</h3>
                <p className="mt-2 text-sm text-neutral-400">{t(`${key}Body`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
