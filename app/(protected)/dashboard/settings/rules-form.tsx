"use client";
import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateRules } from "@/app/_actions/manage-operations";
import type { ResolvedRules } from "@/lib/rules/schemas";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { Separator } from "@/app/_components/ui/separator";
import { Switch } from "@/app/_components/ui/switch";

export function RulesForm({ rules }: { rules: ResolvedRules }) {
  const t = useTranslations("dashboard.settings");
  const [state, setState] = useState(rules);
  const action = useAction(updateRules, {
    onSuccess: () => toast.success(t("rulesSaved")),
    onError: ({ error }) => toast.error(error.serverError ?? t("rulesSaveError")),
  });

  return (
    <form className="grid gap-6" onSubmit={(e) => { e.preventDefault(); action.execute(state); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="slotGranularity">{t("slotGranularity")}</Label>
          <Input id="slotGranularity" type="number" value={state.slotGranularityMinutes} onChange={(e) => setState({ ...state, slotGranularityMinutes: +e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="minLeadTime">{t("minLeadTime")}</Label>
          <Input id="minLeadTime" type="number" value={state.minLeadTimeMinutes} onChange={(e) => setState({ ...state, minLeadTimeMinutes: +e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="maxAdvanceDays">{t("maxAdvanceDays")}</Label>
          <Input id="maxAdvanceDays" type="number" value={state.maxAdvanceDays} onChange={(e) => setState({ ...state, maxAdvanceDays: +e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="defaultPayment">{t("defaultPayment")}</Label>
          <Select value={state.paymentMode} onValueChange={(value) => setState({ ...state, paymentMode: value as typeof state.paymentMode })}>
            <SelectTrigger id="defaultPayment" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ON_SITE">{t("onSite")}</SelectItem>
              <SelectItem value="DEPOSIT">{t("deposit")}</SelectItem>
              <SelectItem value="FULL_PREPAYMENT">{t("fullPrepayment")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="grid gap-3">
        <p className="text-sm font-semibold">{t("cancellationLegend")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="freeUntilHours">{t("freeUntilHours")}</Label>
            <Input id="freeUntilHours" type="number" value={state.cancellation.freeUntilHoursBefore} onChange={(e) => setState({ ...state, cancellation: { ...state.cancellation, freeUntilHoursBefore: +e.target.value } })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="feeType">{t("feeType")}</Label>
            <Select value={state.cancellation.feeType} onValueChange={(value) => setState({ ...state, cancellation: { ...state.cancellation, feeType: value as typeof state.cancellation.feeType } })}>
              <SelectTrigger id="feeType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT">{t("percent")}</SelectItem>
                <SelectItem value="FIXED">{t("fixed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="feeValue">{state.cancellation.feeType === "PERCENT" ? t("feeValuePercent") : t("feeValueCents")}</Label>
            <Input id="feeValue" type="number" value={state.cancellation.feeValue} onChange={(e) => setState({ ...state, cancellation: { ...state.cancellation, feeValue: +e.target.value } })} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid gap-3">
        <p className="text-sm font-semibold">{t("noShowLegend")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="noShowFee">{t("feeCents")}</Label>
            <Input id="noShowFee" type="number" value={state.noShow.feeInCents} onChange={(e) => setState({ ...state, noShow: { ...state.noShow, feeInCents: +e.target.value } })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="blockAfterCount">{t("blockAfterCount")}</Label>
            <Input id="blockAfterCount" type="number" value={state.noShow.blockAfterCount} onChange={(e) => setState({ ...state, noShow: { ...state.noShow, blockAfterCount: +e.target.value } })} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex items-center gap-3">
        <Switch id="overbooking" checked={state.overbookingDefault} onCheckedChange={(checked) => setState({ ...state, overbookingDefault: checked })} />
        <Label htmlFor="overbooking">{t("allowOverbooking")}</Label>
      </div>

      <Button type="submit" disabled={action.isPending} className="w-fit">
        {action.isPending ? "..." : t("saveRules")}
      </Button>
    </form>
  );
}
