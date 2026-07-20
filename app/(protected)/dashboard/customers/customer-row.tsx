"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateCustomer } from "@/app/_actions/manage-operations";

export function CustomerRow({
  customer,
}: {
  customer: { id: string; name: string; email: string | null; phone: string | null; notes: string | null; isBlocked: boolean };
}) {
  const t = useTranslations("dashboard.customers");
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [isBlocked, setIsBlocked] = useState(customer.isBlocked);
  const action = useAction(updateCustomer, {
    onSuccess: () => { toast.success(t("updated")); setEditing(false); },
    onError: ({ error }) => toast.error(error.serverError ?? t("updateError")),
  });

  if (!editing) {
    return (
      <tr className="border-t">
        <td className="p-3">
          <b>{customer.name}</b>
          {customer.notes && <p className="text-muted-foreground">{customer.notes}</p>}
        </td>
        <td className="p-3">{customer.email ?? customer.phone ?? "—"}</td>
        <td className="p-3">{customer.isBlocked ? t("blocked") : t("active")}</td>
        <td className="p-3">
          <button type="button" className="text-xs underline" onClick={() => setEditing(true)}>
            {t("edit")}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t bg-muted/20">
      <td className="p-3" colSpan={4}>
        <div className="flex flex-col gap-2">
          <textarea
            className="rounded-md border p-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isBlocked} onChange={(e) => setIsBlocked(e.target.checked)} />
            {t("blockCustomer")}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
              disabled={action.isPending}
              onClick={() => action.execute({ id: customer.id, notes: notes || null, isBlocked })}
            >
              {action.isPending ? "..." : t("save")}
            </button>
            <button type="button" className="text-sm underline" onClick={() => setEditing(false)}>
              {t("cancel")}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
