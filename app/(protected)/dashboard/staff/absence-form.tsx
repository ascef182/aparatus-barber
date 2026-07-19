"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createAbsence } from "@/app/_actions/manage-operations";

export function AbsenceForm({ staffId, onDone }: { staffId: string; onDone?: () => void }) {
  const t = useTranslations("dashboard.staff");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [type, setType] = useState<"VACATION" | "SICK" | "BLOCK" | "OTHER">("VACATION");

  const action = useAction(createAbsence, {
    onSuccess: () => { toast.success(t("absenceRegistered")); onDone?.(); },
    onError: ({ error }) => toast.error(error.serverError ?? t("absenceRegisterError")),
  });

  return (
    <form
      className="flex flex-col gap-2 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        action.execute({ staffId, startAt: new Date(startAt), endAt: new Date(endAt), type });
      }}
    >
      <div className="flex gap-2">
        <input type="datetime-local" className="rounded-md border p-2" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        <input type="datetime-local" className="rounded-md border p-2" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
      </div>
      <select className="rounded-md border p-2" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
        <option value="VACATION">{t("absenceVacation")}</option>
        <option value="SICK">{t("absenceSick")}</option>
        <option value="BLOCK">{t("absenceBlock")}</option>
        <option value="OTHER">{t("absenceOther")}</option>
      </select>
      <button type="submit" disabled={action.isPending} className="w-fit rounded-md border px-3 py-2">
        {action.isPending ? "..." : t("registerAbsenceSubmit")}
      </button>
    </form>
  );
}
