import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { BillingControls } from "./billing-controls";

export default async function BillingPage() {
  const requestHeaders = await headers(); const session = await auth.api.getSession({ headers: requestHeaders }); const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/"); const organization = await getOrganizationBySlug(slug); if (!organization) redirect("/"); const membership = await getMembership(organization.id, session.user.id); if (membership?.role !== "owner") redirect("/dashboard");
  const t = await getTranslations("dashboard.billing");
  const limits = organization.subscriptionPlan === "STARTER" ? t("limitsStarter") : organization.subscriptionPlan === "GROWTH" ? t("limitsGrowth") : organization.subscriptionPlan === "PRO" ? t("limitsPro") : t("noPlan");
  return <section className="max-w-3xl p-6"><p className="text-sm text-muted-foreground">{t("settingsLabel")}</p><h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1><div className="mb-4 rounded-lg border bg-background p-5"><p className="text-sm text-muted-foreground">{t("currentPlan")}</p><p className="mt-1 text-xl font-semibold">{organization.subscriptionPlan ?? t("trialLabel")}</p><p className="mt-1 text-sm text-muted-foreground">{organization.subscriptionStatus} · {limits}</p>{organization.gracePeriodEndsAt && <p className="mt-2 text-sm text-destructive">{t("regularizeUntil", { date: organization.gracePeriodEndsAt.toLocaleDateString() })}</p>}</div><BillingControls hasSubscription={!!organization.stripeSubscriptionId} hasConnect={!!organization.stripeConnectAccountId} /></section>;
}
