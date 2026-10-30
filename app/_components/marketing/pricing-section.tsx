import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { PLAN_LIMITS } from "@/lib/billing/plan-limits";
import {
  FOUNDER_PLAN,
  GUARANTEE_DAYS,
  GUARANTEE_ENABLED,
  getFounderContactUrl,
} from "@/lib/marketing/offer";
import { getRootUrl } from "@/lib/tenant-host";
import { cn } from "@/lib/utils";
import { PricingCtaButton } from "@/app/_components/pricing-cta-button";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
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

// Stack do Founder Plan — cada bônus existe para matar uma objeção específica
// (ver docs/marketing/grand-slam-offer.md, Fase 2, Bloco C).
const FOUNDER_STACK_KEYS = [
  "founderStackCore",
  "founderStackSetup",
  "founderStackMigration",
  "founderStackPolicy",
  "founderStackSupport",
  "founderStackPrice",
] as const;

export async function PricingSection() {
  const t = await getTranslations("pricing");
  const founderContactUrl = getFounderContactUrl();
  const founderHref = founderContactUrl ?? getRootUrl("/sign-up?plan=starter");

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

        <Reveal delay={0.05}>
          <div className="border-primary/40 bg-secondary/40 relative mt-16 grid gap-8 rounded-xl border p-6 shadow-[0_0_0_1px_rgba(230,57,70,0.18)] md:grid-cols-[1fr_auto] md:p-8">
            <Badge className="absolute -top-3 left-6">
              {t("founderBadge", { spots: FOUNDER_PLAN.spots })}
            </Badge>
            <div>
              <h3 className="text-foreground text-2xl font-semibold">
                {t("founderName")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("founderTagline")}
              </p>
              <ul className="text-foreground mt-6 flex flex-col gap-2 text-sm">
                {FOUNDER_STACK_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" />
                    {t(key, {
                      pilotDays: FOUNDER_PLAN.pilotDays,
                      months: FOUNDER_PLAN.months,
                    })}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center gap-3 md:min-w-64 md:text-center">
              <p className="text-muted-foreground text-sm">
                {t("founderPilot", { pilotDays: FOUNDER_PLAN.pilotDays })}
              </p>
              <p className="text-foreground text-4xl font-semibold">
                R${(FOUNDER_PLAN.priceInCents / 100).toFixed(0)}
                <span className="text-muted-foreground text-base font-normal">
                  {t("perMonth")}
                </span>
              </p>
              <p className="text-muted-foreground text-sm">
                {t("founderTerm", { months: FOUNDER_PLAN.months })}
              </p>
              <p className="text-foreground text-sm font-medium">
                {t("founderAnchor")}
              </p>
              <Button asChild className="w-full">
                {founderContactUrl ? (
                  <a
                    href={founderHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("founderCta")}
                  </a>
                ) : (
                  <Link href={founderHref}>{t("founderCta")}</Link>
                )}
              </Button>
              <p className="text-muted-foreground text-xs">
                {t("founderScarcity", { spots: FOUNDER_PLAN.spots })}
              </p>
            </div>
          </div>
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
