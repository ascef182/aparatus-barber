"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cancelMyBooking } from "@/app/_actions/cancel-my-booking";

type Item = {
  id: string;
  startAt: string;
  status: string;
  service: string;
  staff: string;
  priceInCents: number;
  currency: string;
};

const CANCELLABLE_STATUSES = ["PENDING_PAYMENT", "PENDING", "CONFIRMED"];

function CancelButton({ bookingId }: { bookingId: string }) {
  const t = useTranslations("account.bookings");
  const router = useRouter();
  const cancel = useAction(cancelMyBooking, {
    onSuccess: () => {
      toast.success(t("cancelled"));
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? t("cancelError")),
  });
  return (
    <button
      type="button"
      onClick={() => cancel.execute({ bookingId })}
      disabled={cancel.isPending}
      className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
    >
      {cancel.isPending ? t("cancelling") : t("cancel")}
    </button>
  );
}

export function MyBookings({ bookings, locale, timezone }: { bookings: Item[]; locale: string; timezone: string }) {
  const t = useTranslations("account.bookings");
  if (!bookings.length) {
    return <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <div className="grid gap-3 p-5 md:p-8">
      {bookings.map((booking) => {
        const price = new Intl.NumberFormat(locale, { style: "currency", currency: booking.currency }).format(booking.priceInCents / 100);
        const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(booking.startAt));
        return (
          <article key={booking.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="font-medium">{booking.service}</p>
              <p className="text-sm text-muted-foreground">{date} · {booking.staff}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{price}</span>
              <span className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">{booking.status}</span>
              {CANCELLABLE_STATUSES.includes(booking.status) && <CancelButton bookingId={booking.id} />}
            </div>
          </article>
        );
      })}
    </div>
  );
}
