"use client";
import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateRules } from "@/app/_actions/manage-operations";
import type { ResolvedRules } from "@/lib/rules/schemas";

export function RulesForm({ rules }: { rules: ResolvedRules }) {
  const t = useTranslations("dashboard.settings");
  const [state, setState] = useState(rules);
  const action = useAction(updateRules, {
    onSuccess: () => toast.success(t("rulesSaved")),
    onError: ({ error }) => toast.error(error.serverError ?? t("rulesSaveError")),
  });
  return (
    <form className="grid max-w-xl gap-4" onSubmit={(e) => { e.preventDefault(); action.execute(state); }}>
      <label>{t("slotGranularity")}<input className="mt-1 w-full rounded-md border p-2" type="number" value={state.slotGranularityMinutes} onChange={(e) => setState({ ...state, slotGranularityMinutes: +e.target.value })} /></label>
      <label>{t("minLeadTime")}<input className="mt-1 w-full rounded-md border p-2" type="number" value={state.minLeadTimeMinutes} onChange={(e) => setState({ ...state, minLeadTimeMinutes: +e.target.value })} /></label>
      <label>{t("maxAdvanceDays")}<input className="mt-1 w-full rounded-md border p-2" type="number" value={state.maxAdvanceDays} onChange={(e) => setState({ ...state, maxAdvanceDays: +e.target.value })} /></label>
      <label>{t("defaultPayment")}<select className="mt-1 w-full rounded-md border p-2" value={state.paymentMode} onChange={(e) => setState({ ...state, paymentMode: e.target.value as typeof state.paymentMode })}><option value="ON_SITE">{t("onSite")}</option><option value="DEPOSIT">{t("deposit")}</option><option value="FULL_PREPAYMENT">{t("fullPrepayment")}</option></select></label>

      <fieldset className="rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">{t("cancellationLegend")}</legend>
        <label className="block">{t("freeUntilHours")}<input className="mt-1 w-full rounded-md border p-2" type="number" value={state.cancellation.freeUntilHoursBefore} onChange={(e) => setState({ ...state, cancellation: { ...state.cancellation, freeUntilHoursBefore: +e.target.value } })} /></label>
        <label className="mt-2 block">{t("feeType")}<select className="mt-1 w-full rounded-md border p-2" value={state.cancellation.feeType} onChange={(e) => setState({ ...state, cancellation: { ...state.cancellation, feeType: e.target.value as typeof state.cancellation.feeType } })}><option value="PERCENT">{t("percent")}</option><option value="FIXED">{t("fixed")}</option></select></label>
        <label className="mt-2 block">{state.cancellation.feeType === "PERCENT" ? t("feeValuePercent") : t("feeValueCents")}<input className="mt-1 w-full rounded-md border p-2" type="number" value={state.cancellation.feeValue} onChange={(e) => setState({ ...state, cancellation: { ...state.cancellation, feeValue: +e.target.value } })} /></label>
      </fieldset>

      <fieldset className="rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">{t("noShowLegend")}</legend>
        <label className="block">{t("feeCents")}<input className="mt-1 w-full rounded-md border p-2" type="number" value={state.noShow.feeInCents} onChange={(e) => setState({ ...state, noShow: { ...state.noShow, feeInCents: +e.target.value } })} /></label>
        <label className="mt-2 block">{t("blockAfterCount")}<input className="mt-1 w-full rounded-md border p-2" type="number" value={state.noShow.blockAfterCount} onChange={(e) => setState({ ...state, noShow: { ...state.noShow, blockAfterCount: +e.target.value } })} /></label>
      </fieldset>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={state.overbookingDefault} onChange={(e) => setState({ ...state, overbookingDefault: e.target.checked })} />
        {t("allowOverbooking")}
      </label>

      <button disabled={action.isPending} className="w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground">
        {action.isPending ? "..." : t("saveRules")}
      </button>
    </form>
  );
}
