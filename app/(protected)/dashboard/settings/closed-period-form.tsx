"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClosedPeriod } from "@/app/_actions/manage-operations";

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
      className="grid max-w-xl gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        action.execute({ name, startAt: new Date(startAt), endAt: new Date(endAt) });
      }}
    >
      <input className="rounded-md border p-2" placeholder={t("reasonPlaceholder")} value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="flex gap-2">
        <input type="datetime-local" className="rounded-md border p-2" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        <input type="datetime-local" className="rounded-md border p-2" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
      </div>
      <button type="submit" disabled={action.isPending} className="w-fit rounded-md border px-3 py-2 text-sm">
        {action.isPending ? "..." : t("closePeriodSubmit")}
      </button>
    </form>
  );
}
