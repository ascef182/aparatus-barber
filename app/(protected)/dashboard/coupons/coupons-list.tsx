"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Ticket } from "lucide-react";
import { updateCoupon } from "@/app/_actions/manage-operations";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { EmptyState } from "@/app/_components/ui/empty-state";
import { Switch } from "@/app/_components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/app/_components/ui/sheet";
import { CouponForm } from "./coupon-form";
import { cn } from "@/lib/utils";

type CouponItem = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  validFrom: string | null;
  validUntil: string | null;
  maxRedemptions: number | null;
  scope: "ALL_SERVICES" | "SELECTED_SERVICES";
  isActive: boolean;
  redemptions: number;
  serviceIds: string[];
};

function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const t = useTranslations("dashboard.coupons");
  const action = useAction(updateCoupon, {
    onSuccess: () => toast.success(isActive ? t("deactivated") : t("activated")),
    onError: ({ error }) => toast.error(error.serverError ?? t("genericError")),
  });
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isActive}
        disabled={action.isPending}
        onCheckedChange={() => action.execute({ id, isActive: !isActive })}
        aria-label={isActive ? t("deactivate") : t("activate")}
      />
      <Badge variant={isActive ? "secondary" : "outline"}>{isActive ? t("active") : t("inactive")}</Badge>
    </div>
  );
}

export function CouponsList({
  coupons,
  services,
  locale,
  currency,
}: {
  coupons: CouponItem[];
  services: { id: string; name: string }[];
  locale: string;
  currency: string;
}) {
  const t = useTranslations("dashboard.coupons");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const currencyFormatter = new Intl.NumberFormat(locale, { style: "currency", currency });
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  function valueLabel(coupon: CouponItem) {
    return coupon.type === "PERCENT" ? `${coupon.value}%` : currencyFormatter.format(coupon.value / 100);
  }

  function validityLabel(coupon: CouponItem) {
    if (!coupon.validFrom && !coupon.validUntil) return t("noExpiry");
    const from = coupon.validFrom ? dateFormatter.format(new Date(coupon.validFrom)) : null;
    const until = coupon.validUntil ? dateFormatter.format(new Date(coupon.validUntil)) : null;
    if (from && until) return `${from} – ${until}`;
    if (until) return t("untilDate", { date: until });
    return t("fromDate", { date: from! });
  }

  function redemptionsLabel(coupon: CouponItem) {
    return coupon.maxRedemptions
      ? t("redemptionsWithLimit", { used: coupon.redemptions, max: coupon.maxRedemptions })
      : t("redemptions", { used: coupon.redemptions });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={() => setCreating(true)}>{t("newCoupon")}</Button>
      </div>
      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t("newCoupon")}</SheetTitle>
            <SheetDescription>{t("newCouponDescription")}</SheetDescription>
          </SheetHeader>
          <div className="pt-4">
            <CouponForm services={services} onDone={() => setCreating(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {coupons.length === 0 && (
        <EmptyState icon={Ticket} title={t("noCoupons")} description={t("noCouponsDescription")} />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {coupons.map((coupon) => (
          <article key={coupon.id} className={cn("rounded-xl border bg-card p-5 shadow-sm", !coupon.isActive && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Ticket className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-mono font-semibold">{coupon.code}</h2>
                  <p className="text-sm text-muted-foreground">{valueLabel(coupon)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={t("edit")} onClick={() => setEditingId(coupon.id)}>
                <Pencil className="size-4" />
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary">
                {coupon.scope === "ALL_SERVICES" ? t("scopeAllServices") : t("scopeCount", { count: coupon.serviceIds.length })}
              </Badge>
              <Badge variant="outline">{validityLabel(coupon)}</Badge>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{redemptionsLabel(coupon)}</p>

            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <ActiveToggle id={coupon.id} isActive={coupon.isActive} />
            </div>

            <Sheet open={editingId === coupon.id} onOpenChange={(open) => setEditingId(open ? coupon.id : null)}>
              <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-xl">
                <SheetHeader>
                  <SheetTitle>{t("edit")}</SheetTitle>
                  <SheetDescription>{t("editDescription")}</SheetDescription>
                </SheetHeader>
                <div className="pt-4">
                  <CouponForm coupon={coupon} services={services} onDone={() => setEditingId(null)} />
                </div>
              </SheetContent>
            </Sheet>
          </article>
        ))}
      </div>
    </div>
  );
}
