import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { PLAN_LIMITS } from "@/lib/billing/plan-limits";
import { PricingCtaButton } from "@/app/_components/pricing-cta-button";
import { Badge } from "@/app/_components/ui/badge";

const PLANS = [
  { plan: "STARTER" as const, nameKey: "starterName", taglineKey: "starterTagline" },
  { plan: "GROWTH" as const, nameKey: "growthName", taglineKey: "growthTagline" },
  { plan: "PRO" as const, nameKey: "proName", taglineKey: "proTagline" },
];

export async function PricingSection() {
  const t = await getTranslations("pricing");

  return (
    <section id="pricing" className="border-t border-white/10 bg-neutral-950 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{t("title")}</h2>
          <p className="mt-4 text-neutral-400">{t("subtitle")}</p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {PLANS.map(({ plan, nameKey, taglineKey }) => {
            const limits = PLAN_LIMITS[plan];
            const price = (limits.priceInCents / 100).toFixed(0);
            const isPopular = plan === "GROWTH";
            return (
              <div
                key={plan}
                className={`relative flex flex-col gap-4 rounded-xl border p-6 ${
                  isPopular
                    ? "border-primary/60 bg-primary/[0.07] shadow-[0_0_0_1px_rgba(87,175,120,0.3)]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{t("popularBadge")}</Badge>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-white">{t(nameKey)}</h3>
                  <p className="text-sm text-neutral-400">{t(taglineKey)}</p>
                </div>
                <p className="text-3xl font-semibold text-white">
                  €{price}
                  <span className="text-base font-normal text-neutral-500">{t("perMonth")}</span>
                </p>
                <ul className="flex flex-col gap-2 text-sm text-neutral-300">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {limits.locations === null ? t("unlimitedLocations") : t("locations", { count: limits.locations })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {limits.staff === null ? t("unlimitedStaff") : t("staff", { count: limits.staff })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {t("featureOnlineBooking")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {t("featureStripePayments")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {t("featureEmailSupport")}
                  </li>
                </ul>
                <PricingCtaButton plan={plan} label={t("cta")} />
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-neutral-500">{t("trialNote")}</p>
      </div>
    </section>
  );
}
