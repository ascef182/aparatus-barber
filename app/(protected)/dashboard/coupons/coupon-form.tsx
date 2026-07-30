"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createCoupon, updateCoupon } from "@/app/_actions/manage-operations";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { cn } from "@/lib/utils";

type CouponType = "PERCENT" | "FIXED";
type CouponScope = "ALL_SERVICES" | "SELECTED_SERVICES";

type CouponInput = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  validFrom: string | null;
  validUntil: string | null;
  maxRedemptions: number | null;
  scope: CouponScope;
  serviceIds: string[];
};

// <input type="date"> exige "YYYY-MM-DD" — ISO completo (com hora/tz) quebra o campo.
function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function CouponForm({
  coupon,
  services,
  onDone,
}: {
  coupon?: CouponInput;
  services: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const t = useTranslations("dashboard.coupons");
  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<CouponType>(coupon?.type ?? "PERCENT");
  const [value, setValue] = useState(
    coupon ? String(coupon.type === "PERCENT" ? coupon.value : coupon.value / 100) : "",
  );
  const [validFrom, setValidFrom] = useState(toDateInputValue(coupon?.validFrom ?? null));
  const [validUntil, setValidUntil] = useState(toDateInputValue(coupon?.validUntil ?? null));
  const [maxRedemptions, setMaxRedemptions] = useState(coupon?.maxRedemptions ? String(coupon.maxRedemptions) : "");
  const [scope, setScope] = useState<CouponScope>(coupon?.scope ?? "ALL_SERVICES");
  const [serviceIds, setServiceIds] = useState<string[]>(coupon?.serviceIds ?? []);

  const create = useAction(createCoupon, {
    onSuccess: () => { toast.success(t("created")); onDone?.(); },
    onError: ({ error }) => toast.error(error.serverError ?? error.validationErrors?._errors?.[0] ?? t("createError")),
  });
  const update = useAction(updateCoupon, {
    onSuccess: () => { toast.success(t("updated")); onDone?.(); },
    onError: ({ error }) => toast.error(error.serverError ?? error.validationErrors?._errors?.[0] ?? t("updateError")),
  });
  const pending = create.isPending || update.isPending;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const numericValue = type === "PERCENT"
      ? Math.round(Number(value.replace(",", ".")))
      : Math.round(Number(value.replace(",", ".")) * 100);
    const shared = {
      code: code.toUpperCase(),
      type,
      value: numericValue,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
      scope,
      serviceIds: scope === "SELECTED_SERVICES" ? serviceIds : [],
    };
    if (coupon) update.execute({ id: coupon.id, ...shared });
    else create.execute(shared);
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-1.5">
        <Label htmlFor="coupon-code">{t("codeLabel")}</Label>
        <Input id="coupon-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required minLength={3} maxLength={32} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label>{t("typeLabel")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as CouponType)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT">{t("typePercent")}</SelectItem>
              <SelectItem value="FIXED">{t("typeFixed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="coupon-value">{t("valueLabel")}</Label>
          <Input
            id="coupon-value"
            type="number"
            min={type === "PERCENT" ? 1 : 0.01}
            max={type === "PERCENT" ? 100 : undefined}
            step={type === "PERCENT" ? 1 : 0.01}
            placeholder={type === "PERCENT" ? t("valuePercentPlaceholder") : t("valueFixedPlaceholder")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="coupon-valid-from">{t("validFromLabel")}</Label>
          <Input id="coupon-valid-from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="coupon-valid-until">{t("validUntilLabel")}</Label>
          <Input id="coupon-valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="coupon-max-redemptions">{t("maxRedemptionsLabel")}</Label>
        <Input
          id="coupon-max-redemptions"
          type="number"
          min={1}
          placeholder={t("noLimitPlaceholder")}
          value={maxRedemptions}
          onChange={(e) => setMaxRedemptions(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>{t("scopeLabel")}</Label>
        <Select value={scope} onValueChange={(v) => setScope(v as CouponScope)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_SERVICES">{t("scopeAllServices")}</SelectItem>
            <SelectItem value="SELECTED_SERVICES">{t("scopeSelectedServices")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {scope === "SELECTED_SERVICES" && (
        <div className="grid gap-1.5">
          <Label>{t("servicesLabel")}</Label>
          <div className="flex flex-wrap gap-2">
            {services.map((service) => {
              const selected = serviceIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() =>
                    setServiceIds((current) => (selected ? current.filter((id) => id !== service.id) : [...current, service.id]))
                  }
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {service.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "..." : coupon ? t("saveChanges") : t("createSubmit")}
      </Button>
    </form>
  );
}
