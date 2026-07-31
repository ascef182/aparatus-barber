"use client";

import { useTranslations } from "next-intl";

type Redemption = {
  id: string;
  startAt: string;
  serviceName: string;
  couponCode: string;
  discountInCents: number;
  currency: string;
};

export function RedemptionHistory({
  redemptions,
  locale,
  timezone,
}: {
  redemptions: Redemption[];
  locale: string;
  timezone: string;
}) {
  const t = useTranslations("account.coupons");
  if (!redemptions.length) {
    return <p className="text-sm text-muted-foreground">{t("noRedemptions")}</p>;
  }
  return (
    <div className="grid gap-3">
      {redemptions.map((redemption) => {
        const discount = new Intl.NumberFormat(locale, { style: "currency", currency: redemption.currency }).format(
          redemption.discountInCents / 100,
        );
        const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: timezone }).format(
          new Date(redemption.startAt),
        );
        return (
          <article key={redemption.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="font-medium">{redemption.serviceName}</p>
              <p className="text-sm text-muted-foreground">
                {date} · {redemption.couponCode}
              </p>
            </div>
            <span className="text-sm font-medium">-{discount}</span>
          </article>
        );
      })}
    </div>
  );
}
