"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createService, updateService } from "@/app/_actions/manage-operations";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";

type UploadedImage = { url: string; publicId?: string };
type ServiceInput = { id?: string; name: string; durationMinutes: number; priceInCents: number; paymentMode?: "ON_SITE" | "DEPOSIT" | "FULL_PREPAYMENT"; depositPercent?: number; images?: UploadedImage[] };

export function ServiceForm({ service, onDone }: { service?: ServiceInput; onDone?: () => void }) {
  const t = useTranslations("dashboard.services");
  const [name, setName] = useState(service?.name ?? "");
  const [durationMinutes, setDurationMinutes] = useState(service?.durationMinutes ?? 30);
  const [price, setPrice] = useState((service?.priceInCents ?? 0) / 100);
  const [paymentMode, setPaymentMode] = useState(service?.paymentMode ?? "ON_SITE");
  const [depositPercent, setDepositPercent] = useState(service?.depositPercent ?? 20);
  const [images, setImages] = useState<UploadedImage[]>(service?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [promo, setPromo] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(10);

  const create = useAction(createService, {
    onSuccess: () => { toast.success(t("created")); onDone?.(); },
    onError: ({ error }) => toast.error(error.serverError ?? error.validationErrors?._errors?.[0] ?? t("createError")),
  });
  const update = useAction(updateService, {
    onSuccess: () => { toast.success(t("updated")); onDone?.(); },
    onError: ({ error }) => toast.error(error.serverError ?? t("updateError")),
  });

  async function upload(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    try {
      const results = await Promise.all(
        [...files].slice(0, 5 - images.length).map(async (file) => {
          const body = new FormData();
          body.set("file", file);
          const response = await fetch("/api/media/upload", { method: "POST", body });
          if (!response.ok) throw new Error();
          return response.json() as Promise<UploadedImage>;
        }),
      );
      setImages((current) => [...current, ...results]);
    } catch {
      toast.error(t("imageUploadError"));
    } finally {
      setUploading(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const shared = {
      name,
      durationMinutes,
      priceInCents: Math.round(price * 100),
      paymentMode,
      depositPercent: paymentMode === "DEPOSIT" ? depositPercent : undefined,
    };
    if (service?.id) update.execute({ id: service.id, ...shared, images });
    else create.execute({ ...shared, images, promotion: promo ? { code, type: "PERCENT" as const, value: discount, scope: "ALL_SERVICES" as const, serviceIds: [] } : undefined });
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-1.5">
        <Label htmlFor="service-name">{t("namePlaceholder")}</Label>
        <Input id="service-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex gap-2">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="service-duration">{t("durationPlaceholder")}</Label>
          <Input id="service-duration" type="number" min={5} value={durationMinutes} onChange={(e) => setDurationMinutes(+e.target.value)} required />
        </div>
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="service-price">{t("pricePlaceholder")}</Label>
          <Input id="service-price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(+e.target.value)} required />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>{t("paymentModeLabel")}</Label>
        <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as typeof paymentMode)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ON_SITE">{t("onSite")}</SelectItem>
            <SelectItem value="DEPOSIT">{t("deposit")}</SelectItem>
            <SelectItem value="FULL_PREPAYMENT">{t("fullPrepayment")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {paymentMode === "DEPOSIT" && (
        <div className="grid gap-1.5">
          <Label htmlFor="service-deposit">{t("depositPercentPlaceholder")}</Label>
          <Input id="service-deposit" type="number" min={1} max={100} value={depositPercent} onChange={(e) => setDepositPercent(+e.target.value)} required />
        </div>
      )}
      <div className="grid gap-1.5 text-sm">
        <Label htmlFor="service-images">{t("imagesLabel")}</Label>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div key={image.publicId ?? image.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails vêm do Cloudinary, fora dos remotePatterns de next/image */}
                <img src={image.url} alt="" className="size-16 rounded-md border object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground"
                  aria-label={t("removeImage")}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <Input id="service-images" type="file" accept="image/*" multiple disabled={uploading || images.length >= 5} onChange={(e) => upload(e.target.files)} />
        {images.length > 0 && <p className="text-xs text-muted-foreground">{t("imagesUploaded", { count: images.length })}</p>}
      </div>
      {!service && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} />
            {t("createCouponLabel")}
          </label>
          {promo && (
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="service-coupon-code">{t("couponCodePlaceholder")}</Label>
                <Input id="service-coupon-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="service-coupon-discount">{t("couponDiscountPlaceholder")}</Label>
                <Input id="service-coupon-discount" type="number" min={1} max={100} value={discount} onChange={(e) => setDiscount(+e.target.value)} required />
              </div>
            </div>
          )}
        </>
      )}
      <Button type="submit" disabled={uploading || create.isPending || update.isPending}>
        {create.isPending || update.isPending ? "..." : service ? t("saveChanges") : t("createService")}
      </Button>
    </form>
  );
}
