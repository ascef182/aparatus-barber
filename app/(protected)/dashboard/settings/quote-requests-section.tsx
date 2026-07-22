"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateQuoteRequestStatusAction } from "@/app/_actions/update-quote-request-status";

type QuoteRequest = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  message: string;
  status: "NEW" | "CONTACTED" | "CLOSED";
  createdAt: string;
};

function StatusSelect({ quoteRequest }: { quoteRequest: QuoteRequest }) {
  const t = useTranslations("dashboard.settings");
  const [status, setStatus] = useState(quoteRequest.status);
  const action = useAction(updateQuoteRequestStatusAction, {
    onError: ({ error }) => {
      setStatus(quoteRequest.status);
      toast.error(error.serverError ?? t("quoteStatusError"));
    },
  });

  function change(next: QuoteRequest["status"]) {
    setStatus(next);
    action.execute({ id: quoteRequest.id, status: next });
  }

  return (
    <select
      className="rounded-md border p-1.5 text-xs"
      value={status}
      disabled={action.isPending}
      onChange={(e) => change(e.target.value as QuoteRequest["status"])}
    >
      <option value="NEW">{t("quoteStatusNew")}</option>
      <option value="CONTACTED">{t("quoteStatusContacted")}</option>
      <option value="CLOSED">{t("quoteStatusClosed")}</option>
    </select>
  );
}

export function QuoteRequestsSection({ quoteRequests }: { quoteRequests: QuoteRequest[] }) {
  const t = useTranslations("dashboard.settings");

  if (quoteRequests.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("quoteRequestsEmpty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {quoteRequests.map((quoteRequest) => (
        <div key={quoteRequest.id} className="rounded-lg border p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{quoteRequest.customerName}</p>
              <p className="text-xs text-muted-foreground">
                {[quoteRequest.customerEmail, quoteRequest.customerPhone].filter(Boolean).join(" · ")}
              </p>
            </div>
            <StatusSelect quoteRequest={quoteRequest} />
          </div>
          <p className="mt-2 text-muted-foreground">{quoteRequest.message}</p>
        </div>
      ))}
    </div>
  );
}
