import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDashboardContext } from "@/lib/services/dashboard-context-service";
import { BillingControls } from "./billing-controls";
import { SubscriptionStatusToast } from "./subscription-status-toast";

export default async function BillingPage({ searchParams }: PageProps<"/dashboard/billing">) {
  const { success, canceled } = await searchParams;
  const status = success === "1" ? "success" : canceled === "1" ? "canceled" : null;
  const requestHeaders = await headers();
  const ctx = await getDashboardContext(requestHeaders);
  if (!ctx) redirect("/");
  const { organization, membership } = ctx;
  if (membership.role !== "owner") redirect("/dashboard");
  const t = await getTranslations("dashboard.billing");
  const limits = organization.subscriptionPlan === "STARTER" ? t("limitsStarter") : organization.subscriptionPlan === "GROWTH" ? t("limitsGrowth") : organization.subscriptionPlan === "PRO" ? t("limitsPro") : t("noPlan");
  return <section className="max-w-3xl p-6"><SubscriptionStatusToast status={status} successMessage={t("subscriptionSuccessBanner")} canceledMessage={t("subscriptionCanceledBanner")} /><p className="text-sm text-muted-foreground">{t("settingsLabel")}</p><h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1><div className="mb-4 rounded-lg border bg-background p-5"><p className="text-sm text-muted-foreground">{t("currentPlan")}</p><p className="mt-1 text-xl font-semibold">{organization.subscriptionPlan ?? t("trialLabel")}</p><p className="mt-1 text-sm text-muted-foreground">{organization.subscriptionStatus} · {limits}</p>{organization.gracePeriodEndsAt && <p className="mt-2 text-sm text-destructive">{t("regularizeUntil", { date: organization.gracePeriodEndsAt.toLocaleDateString() })}</p>}</div><BillingControls hasSubscription={!!organization.stripeSubscriptionId} hasConnect={!!organization.stripeConnectAccountId} chargesEnabled={organization.chargesEnabled} intendedPlan={organization.subscriptionPlan} /></section>;
}
