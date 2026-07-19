"use client";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { createSubscriptionCheckout } from "@/app/_actions/create-subscription-checkout";
import { createConnectOnboarding } from "@/app/_actions/create-connect-onboarding";
import { createBillingPortal } from "@/app/_actions/create-billing-portal";

export function BillingControls({ hasSubscription, hasConnect }: { hasSubscription: boolean; hasConnect: boolean }) {
  const t = useTranslations("dashboard.billing");
  const checkout = useAction(createSubscriptionCheckout); const connect = useAction(createConnectOnboarding); const portal = useAction(createBillingPortal);
  async function subscribe(plan: "STARTER" | "GROWTH" | "PRO") { const result = await checkout.executeAsync({ plan }); if (result.data?.url) window.location.assign(result.data.url); }
  async function openPortal() { const result = await portal.executeAsync(); if (result.data?.url) window.location.assign(result.data.url); }
  async function onboard() { const result = await connect.executeAsync(); if (result.data?.url) window.location.assign(result.data.url); }
  return <div className="grid gap-4"><section className="rounded-lg border bg-background p-5"><h2 className="font-semibold">{t("saasSubscription")}</h2>{hasSubscription ? <button className="mt-3 rounded-md border px-3 py-2" onClick={openPortal} disabled={portal.isPending}>{t("manageSubscription")}</button> : <div className="mt-3 flex flex-wrap gap-2">{(["STARTER", "GROWTH", "PRO"] as const).map((plan) => <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground" key={plan} onClick={() => subscribe(plan)} disabled={checkout.isPending}>{t("subscribeTo", { plan })}</button>)}</div>}</section><section className="rounded-lg border bg-background p-5"><h2 className="font-semibold">{t("customerPayments")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("customerPaymentsDesc")}</p><button className="mt-3 rounded-md border px-3 py-2" onClick={onboard} disabled={connect.isPending}>{hasConnect ? t("continueOnboarding") : t("connectStripe")}</button></section></div>;
}
