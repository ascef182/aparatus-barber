"use client";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createSubscriptionCheckout } from "@/app/_actions/create-subscription-checkout";
import { createConnectOnboarding } from "@/app/_actions/create-connect-onboarding";
import { createBillingPortal } from "@/app/_actions/create-billing-portal";
import { getVisitorId } from "@/lib/fingerprint-client";

export function BillingControls({
  hasSubscription,
  hasConnect,
  chargesEnabled,
  intendedPlan,
}: {
  hasSubscription: boolean;
  hasConnect: boolean;
  chargesEnabled: boolean;
  intendedPlan?: "STARTER" | "GROWTH" | "PRO" | null;
}) {
  const t = useTranslations("dashboard.billing");
  // Sem onError, uma action bloqueada (trial vencido, 2FA vencido, erro do
  // Stripe...) falha em silêncio total: result.data fica undefined e nada
  // acontece na tela, sem toast nem log — foi assim que "conectar Stripe"
  // parou de funcionar sem nenhuma mensagem visível.
  const onActionError = ({ error }: { error: { serverError?: string } }) =>
    toast.error(error.serverError ?? t("genericError"));
  const checkout = useAction(createSubscriptionCheckout, { onError: onActionError });
  const connect = useAction(createConnectOnboarding, { onError: onActionError });
  const portal = useAction(createBillingPortal, { onError: onActionError });
  async function subscribe(plan: "STARTER" | "GROWTH" | "PRO") { const visitorId = await getVisitorId(); const result = await checkout.executeAsync({ plan, visitorId: visitorId ?? undefined }); if (result.data?.url) window.location.assign(result.data.url); }
  async function openPortal() { const result = await portal.executeAsync(); if (result.data?.url) window.location.assign(result.data.url); }
  async function onboard() { const result = await connect.executeAsync(); if (result.data?.url) window.location.assign(result.data.url); }
  return <div className="grid gap-4"><section className="rounded-lg border bg-background p-5"><h2 className="font-semibold">{t("saasSubscription")}</h2>{hasSubscription ? <button className="mt-3 rounded-md border px-3 py-2" onClick={openPortal} disabled={portal.isPending}>{t("manageSubscription")}</button> : <div className="mt-3 flex flex-wrap gap-2">{(["STARTER", "GROWTH", "PRO"] as const).map((plan) => <button className={`rounded-md px-3 py-2 ${plan === intendedPlan ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" : "border"}`} key={plan} onClick={() => subscribe(plan)} disabled={checkout.isPending}>{plan === intendedPlan ? t("subscribeToChosen", { plan }) : t("subscribeTo", { plan })}</button>)}</div>}</section><section className="rounded-lg border bg-background p-5"><h2 className="font-semibold">{t("customerPayments")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("customerPaymentsDesc")}</p>{hasConnect && <p className={`mt-2 text-sm ${chargesEnabled ? "text-green-600" : "text-amber-600"}`}>{chargesEnabled ? t("connectActive") : t("connectPending")}</p>}<button className="mt-3 rounded-md border px-3 py-2" onClick={onboard} disabled={connect.isPending}>{hasConnect ? t("continueOnboarding") : t("connectStripe")}</button></section></div>;
}
