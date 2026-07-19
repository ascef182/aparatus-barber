"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setStaffWorkingHours } from "@/app/_actions/manage-operations";

const WEEKDAY_KEYS = ["weekdaySun", "weekdayMon", "weekdayTue", "weekdayWed", "weekdayThu", "weekdayFri", "weekdaySat"] as const;

type Hour = { weekday: number; startTime: string; endTime: string };

export function WorkingHoursForm({
  staffId,
  initialHours,
  onDone,
}: {
  staffId: string;
  initialHours: Hour[];
  onDone?: () => void;
}) {
  const t = useTranslations("dashboard.staff");
  const [days, setDays] = useState(() =>
    WEEKDAY_KEYS.map((_, weekday) => {
      const existing = initialHours.find((h) => h.weekday === weekday);
      return { enabled: !!existing, startTime: existing?.startTime ?? "09:00", endTime: existing?.endTime ?? "18:00" };
    }),
  );

  const action = useAction(setStaffWorkingHours, {
    onSuccess: () => { toast.success(t("scheduleSaved")); onDone?.(); },
    onError: ({ error }) => toast.error(error.serverError ?? t("scheduleSaveError")),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const hours = days
      .map((day, weekday) => ({ ...day, weekday }))
      .filter((day) => day.enabled)
      .map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime }));
    action.execute({ staffId, hours });
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={submit}>
      {WEEKDAY_KEYS.map((key, weekday) => (
        <div key={weekday} className="flex items-center gap-2 text-sm">
          <label className="flex w-28 items-center gap-2">
            <input
              type="checkbox"
              checked={days[weekday]!.enabled}
              onChange={(e) =>
                setDays((current) => current.map((d, i) => (i === weekday ? { ...d, enabled: e.target.checked } : d)))
              }
            />
            {t(key)}
          </label>
          {days[weekday]!.enabled && (
            <>
              <input
                type="time"
                className="rounded-md border p-1"
                value={days[weekday]!.startTime}
                onChange={(e) => setDays((current) => current.map((d, i) => (i === weekday ? { ...d, startTime: e.target.value } : d)))}
              />
              <span>–</span>
              <input
                type="time"
                className="rounded-md border p-1"
                value={days[weekday]!.endTime}
                onChange={(e) => setDays((current) => current.map((d, i) => (i === weekday ? { ...d, endTime: e.target.value } : d)))}
              />
            </>
          )}
        </div>
      ))}
      <button type="submit" disabled={action.isPending} className="mt-2 w-fit rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
        {action.isPending ? "..." : t("saveSchedule")}
      </button>
    </form>
  );
}
