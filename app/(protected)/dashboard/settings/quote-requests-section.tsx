"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateQuoteRequestStatusAction } from "@/app/_actions/update-quote-request-status";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";

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
    <Select value={status} disabled={action.isPending} onValueChange={(value) => change(value as QuoteRequest["status"])}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="NEW">{t("quoteStatusNew")}</SelectItem>
        <SelectItem value="CONTACTED">{t("quoteStatusContacted")}</SelectItem>
        <SelectItem value="CLOSED">{t("quoteStatusClosed")}</SelectItem>
      </SelectContent>
    </Select>
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
