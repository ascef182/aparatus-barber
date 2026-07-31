"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClosedPeriod } from "@/app/_actions/manage-operations";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";

export function ClosedPeriodForm() {
  const t = useTranslations("dashboard.settings");
  const [name, setName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const action = useAction(createClosedPeriod, {
    onSuccess: () => { toast.success(t("closePeriodRegistered")); setName(""); setStartAt(""); setEndAt(""); },
    onError: ({ error }) => toast.error(error.serverError ?? t("closePeriodError")),
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        action.execute({ name, startAt: new Date(startAt), endAt: new Date(endAt) });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="closed-period-name">{t("reasonPlaceholder")}</Label>
        <Input id="closed-period-name" placeholder={t("reasonPlaceholder")} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="closed-period-start">{t("closePeriodStart")}</Label>
          <Input id="closed-period-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="closed-period-end">{t("closePeriodEnd")}</Label>
          <Input id="closed-period-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
        </div>
      </div>
      <Button type="submit" disabled={action.isPending} className="w-fit">
        {action.isPending ? "..." : t("closePeriodSubmit")}
      </Button>
    </form>
  );
}
