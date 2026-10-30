import { getTranslations } from "next-intl/server";
import { Check, ShieldCheck } from "lucide-react";
import { PLAN_LIMITS } from "@/lib/billing/plan-limits";
import { GUARANTEE_DAYS, GUARANTEE_ENABLED } from "@/lib/marketing/offer";
import { cn } from "@/lib/utils";
import { PricingCtaButton } from "@/app/_components/pricing-cta-button";
import { Badge } from "@/app/_components/ui/badge";
import { Reveal } from "./reveal";

const PLANS = [
  {
    plan: "STARTER" as const,
    nameKey: "starterName",
    taglineKey: "starterTagline",
  },
  {
    plan: "GROWTH" as const,
    nameKey: "growthName",
    taglineKey: "growthTagline",
  },
  { plan: "PRO" as const, nameKey: "proName", taglineKey: "proTagline" },
];

// Resultado, não funcionalidade: cada item responde "o que muda no meu dia".
const PLAN_OUTCOME_KEYS = [
  "featureBookingPage",
  "featureDeposit",
  "featureNoCommission",
] as const;

export async function PricingSection() {
  const t = await getTranslations("pricing");

  return (
    <section
      id="pricing"
      className="border-border bg-background border-t px-6 py-24"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mt-4">{t("subtitle")}</p>
        </Reveal>

        {GUARANTEE_ENABLED && (
          <Reveal delay={0.1}>
            <div className="border-border bg-card mt-6 flex items-start gap-4 rounded-xl border p-6">
              <ShieldCheck
                className="text-primary size-8 shrink-0"
                aria-hidden
              />
              <div>
                <h3 className="text-foreground font-semibold">
                  {t("guaranteeTitle")}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("guaranteeBody", { days: GUARANTEE_DAYS })}
                </p>
              </div>
            </div>
          </Reveal>
        )}

        <Reveal delay={0.1} className="mt-16 text-center">
          <h3 className="text-foreground text-xl font-semibold">
            {t("gaTitle")}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("gaSubtitle")}
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">{t("gaTitle")}</caption>
            <thead>
              <tr>
                <th scope="col" className="w-1/4" />
                {PLANS.map(({ plan, nameKey, taglineKey }) => {
                  const isPopular = plan === "GROWTH";
                  return (
                    <th
                      key={plan}
                      scope="col"
                      className={cn(
                        "relative px-4 py-5 text-center align-bottom",
                        isPopular && "bg-secondary/40 rounded-t-xl",
                      )}
                    >
                      {isPopular && (
                        <Badge
                          variant="secondary"
                          className="absolute -top-3 left-1/2 -translate-x-1/2"
                        >
                          {t("popularBadge")}
                        </Badge>
                      )}
                      <p className="text-foreground text-lg font-semibold">
                        {t(nameKey)}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs font-normal">
                        {t(taglineKey)}
                      </p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th
                  scope="row"
                  className="text-muted-foreground border-border border-t px-4 py-4 text-left font-medium"
                >
                  {t("priceRowLabel")}
                </th>
                {PLANS.map(({ plan }) => {
                  const isPopular = plan === "GROWTH";
                  const price = (PLAN_LIMITS[plan].priceInCents / 100).toFixed(
                    0,
                  );
                  return (
                    <td
                      key={plan}
                      className={cn(
                        "border-border border-t px-4 py-4 text-center",
                        isPopular && "bg-secondary/40",
                      )}
                    >
                      <span className="text-foreground text-2xl font-bold">
                        R${price}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {t("perMonth")}
                      </span>
                    </td>
                  );
                })}
              </tr>

              <tr>
                <th
                  scope="row"
                  className="text-muted-foreground border-border border-t px-4 py-3 text-left font-medium"
                >
                  {t("locationsRowLabel")}
                </th>
                {PLANS.map(({ plan }) => {
                  const limits = PLAN_LIMITS[plan];
                  const isPopular = plan === "GROWTH";
                  return (
                    <td
                      key={plan}
                      className={cn(
                        "text-foreground border-border border-t px-4 py-3 text-center",
                        isPopular && "bg-secondary/40",
                      )}
                    >
                      {limits.locations === null
                        ? t("unlimitedLocations")
                        : t("locations", { count: limits.locations })}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <th
                  scope="row"
                  className="text-muted-foreground border-border border-t px-4 py-3 text-left font-medium"
                >
                  {t("staffRowLabel")}
                </th>
                {PLANS.map(({ plan }) => {
                  const limits = PLAN_LIMITS[plan];
                  const isPopular = plan === "GROWTH";
                  return (
                    <td
                      key={plan}
                      className={cn(
                        "text-foreground border-border border-t px-4 py-3 text-center",
                        isPopular && "bg-secondary/40",
                      )}
                    >
                      {limits.staff === null
                        ? t("unlimitedStaff")
                        : t("staff", { count: limits.staff })}
                    </td>
                  );
                })}
              </tr>

              {PLAN_OUTCOME_KEYS.map((key) => (
                <tr key={key}>
                  <th
                    scope="row"
                    className="text-muted-foreground border-border border-t px-4 py-3 text-left font-medium"
                  >
                    {t(key)}
                  </th>
                  {PLANS.map(({ plan }) => {
                    const isPopular = plan === "GROWTH";
                    return (
                      <td
                        key={plan}
                        className={cn(
                          "border-border border-t px-4 py-3 text-center",
                          isPopular && "bg-secondary/40",
                        )}
                      >
                        <Check
                          className="text-primary mx-auto size-4"
                          aria-label={t("includedInAllPlans")}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr>
                <th scope="row" className="sr-only">
                  {t("cta")}
                </th>
                {PLANS.map(({ plan }) => {
                  const isPopular = plan === "GROWTH";
                  return (
                    <td
                      key={plan}
                      className={cn(
                        "border-border border-t px-4 py-5 text-center",
                        isPopular && "bg-secondary/40 rounded-b-xl",
                      )}
                    >
                      <PricingCtaButton plan={plan} label={t("cta")} />
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </Reveal>

        <p className="text-muted-foreground mt-8 text-center text-sm">
          {t("trialNote")}
        </p>
      </div>
    </section>
  );
}
