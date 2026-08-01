"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Separator } from "@/app/_components/ui/separator";
import { Calendar } from "@/app/_components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/app/_components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { getDashboardAvailability } from "@/app/_actions/get-dashboard-availability";
import { createManualBooking } from "@/app/_actions/create-manual-booking";
import { validateCouponAction } from "@/app/_actions/validate-coupon";
import type { AvailableSlot } from "@/lib/scheduling/availability";

type Service = { id: string; name: string; durationMinutes: number; priceInCents: number; currency: string };
type Staff = { id: string; displayName: string; serviceIds: string[] };

const COUPON_REASON_KEYS = {
  invalid: "couponReasonInvalid",
  not_yet_valid: "couponReasonNotYetValid",
  expired: "couponReasonExpired",
  exhausted: "couponReasonExhausted",
  wrong_service: "couponReasonWrongService",
} as const;

/** Reserva manual/walk-in pelo staff — mesmo padrão de Sheet do wizard
 * público (app/t/[slug]/service-item.tsx), adaptado pra escolher serviço e
 * profissional em vez de já vir de um card fixo. */
export function NewBookingSheet({ services, staff }: { services: Service[]; staff: Staff[] }) {
  const t = useTranslations("dashboard.agenda.newBooking");
  const tCoupon = useTranslations("booking");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"setup" | "details">("setup");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<AvailableSlot | undefined>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountInCents: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const availability = useAction(getDashboardAvailability);
  const couponValidation = useAction(validateCouponAction);
  const booking = useAction(createManualBooking, {
    onSuccess: () => {
      toast.success(t("created"));
      handleOpenChange(false);
    },
    onError: ({ error }) => toast.error(error.serverError ?? t("createError")),
  });

  const selectedService = services.find((service) => service.id === serviceId);

  async function handleApplyCoupon() {
    if (!couponCode.trim() || !selectedService) return;
    setCouponError(null);
    const result = await couponValidation.executeAsync({ code: couponCode.trim(), serviceId: selectedService.id });
    if (result.serverError || !result.data) {
      setCouponError(tCoupon("couponGenericError"));
      return;
    }
    if (!result.data.valid) {
      setCouponError(tCoupon(COUPON_REASON_KEYS[result.data.reasonCode]));
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon({ code: couponCode.trim(), discountInCents: result.data.discountInCents });
  }

  const eligibleStaff = serviceId ? staff.filter((member) => member.serviceIds.includes(serviceId)) : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  async function handleDateSelect(value: Date | undefined) {
    setDate(value);
    setSlot(undefined);
    if (value && serviceId) {
      await availability.executeAsync({
        serviceId,
        staffId: staffId || undefined,
        dateISO: format(value, "yyyy-MM-dd"),
      });
    }
  }

  function handleSlotSelect(item: AvailableSlot) {
    setSlot(item);
    if (!staffId) setStaffId(item.staffIds[0] ?? "");
  }

  function handleConfirm() {
    if (!slot || !serviceId || !name || (!email && !phone)) return;
    const resolvedStaffId = staffId || slot.staffIds[0];
    if (!resolvedStaffId) return;
    booking.execute({
      serviceId,
      staffId: resolvedStaffId,
      startAt: slot.startAt,
      customer: { name, email: email || undefined, phone: phone || undefined },
      couponCode: appliedCoupon?.code,
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setStep("setup");
      setServiceId("");
      setStaffId("");
      setDate(undefined);
      setSlot(undefined);
      setName("");
      setEmail("");
      setPhone("");
      setCouponCode("");
      setAppliedCoupon(null);
      setCouponError(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          {t("title")}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-sm">
        {step === "setup" ? (
          <div className="flex flex-col gap-6">
            <SheetHeader className="px-5 pt-6">
              <SheetTitle className="text-lg font-bold">{t("title")}</SheetTitle>
            </SheetHeader>

            <div className="grid gap-3 px-5">
              <div className="grid gap-1.5">
                <Label>{t("chooseService")}</Label>
                <Select
                  value={serviceId}
                  onValueChange={(value) => {
                    setServiceId(value);
                    setStaffId("");
                    setSlot(undefined);
                    if (date) void handleDateSelect(date);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {serviceId && eligibleStaff.length === 0 && (
                <div className="rounded-input border border-dashed p-3 text-sm">
                  <p className="text-muted-foreground">{t("noStaffForService")}</p>
                  <Link href="/dashboard/staff" className="mt-1 inline-block font-medium text-primary hover:underline">
                    {t("manageStaffLink")}
                  </Link>
                </div>
              )}

              {serviceId && eligibleStaff.length > 0 && (
                <div className="grid gap-1.5">
                  <Label>{t("chooseStaff")}</Label>
                  <Select
                    value={staffId}
                    onValueChange={(value) => {
                      setStaffId(value);
                      setSlot(undefined);
                      if (date) void handleDateSelect(date);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleStaff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {serviceId && eligibleStaff.length > 0 && (
              <div className="px-5">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  disabled={{ before: today }}
                  className="w-full p-0"
                />
              </div>
            )}

            {date && serviceId && eligibleStaff.length > 0 && (
              <>
                <Separator />
                {availability.isPending ? (
                  <p className="px-5 text-center text-sm text-muted-foreground">{t("loadingSlots")}</p>
                ) : availability.result.serverError ? (
                  <p className="px-5 text-center text-sm text-muted-foreground">{t("slotsError")}</p>
                ) : availability.result.data?.length === 0 ? (
                  <p className="px-5 text-center text-sm text-muted-foreground">{t("noSlots")}</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto px-5 pb-1 [&::-webkit-scrollbar]:hidden">
                    {availability.result.data?.map((item) => (
                      <Button
                        key={item.startAt.toString()}
                        type="button"
                        variant={slot?.startAt.getTime() === item.startAt.getTime() ? "default" : "outline"}
                        className="shrink-0 rounded-full px-4"
                        onClick={() => handleSlotSelect(item)}
                      >
                        {item.time}
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="px-5 pb-6">
              <Button className="w-full rounded-full" disabled={!slot} onClick={() => setStep("details")}>
                {t("continue")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <SheetHeader className="flex-row items-center gap-2 space-y-0 px-5 pt-6">
              <Button size="icon" variant="ghost" className="-ml-2 rounded-full" onClick={() => setStep("setup")}>
                <ChevronLeft className="size-5" />
                <span className="sr-only">{t("back")}</span>
              </Button>
              <SheetTitle className="text-lg font-bold">{t("title")}</SheetTitle>
            </SheetHeader>

            <div className="grid gap-3 px-5">
              <div className="grid gap-1.5">
                <Label htmlFor="walkin-name">{t("namePlaceholder")}</Label>
                <Input id="walkin-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="walkin-email">{t("emailPlaceholder")}</Label>
                <Input id="walkin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="walkin-phone">{t("phonePlaceholder")}</Label>
                <Input id="walkin-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              {!email && !phone && <p className="text-xs text-muted-foreground">{t("contactRequired")}</p>}
            </div>

            <Separator />

            <div className="px-5">
              <Label htmlFor="walkin-coupon">{tCoupon("couponLabel")}</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="walkin-coupon"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setAppliedCoupon(null);
                    setCouponError(null);
                  }}
                  placeholder={tCoupon("couponPlaceholder")}
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!couponCode.trim() || couponValidation.isPending || !!appliedCoupon}
                  onClick={handleApplyCoupon}
                >
                  {couponValidation.isPending ? tCoupon("couponApplying") : tCoupon("couponApply")}
                </Button>
              </div>
              {couponError && <p className="mt-1.5 text-xs text-destructive">{couponError}</p>}
              {appliedCoupon && <p className="mt-1.5 text-xs text-primary">{tCoupon("couponApplied")}</p>}
            </div>

            {selectedService && (
              <div className="px-5">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <p className="text-sm font-medium">{selectedService.name}</p>
                  {appliedCoupon ? (
                    <span className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground line-through">
                        {new Intl.NumberFormat(undefined, { style: "currency", currency: selectedService.currency }).format(selectedService.priceInCents / 100)}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {new Intl.NumberFormat(undefined, { style: "currency", currency: selectedService.currency }).format(
                          Math.max(0, selectedService.priceInCents - appliedCoupon.discountInCents) / 100,
                        )}
                      </span>
                    </span>
                  ) : (
                    <p className="text-sm font-bold">
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: selectedService.currency }).format(selectedService.priceInCents / 100)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="px-5 pb-6">
              <Button
                className="w-full rounded-full"
                disabled={!name || (!email && !phone) || booking.isPending}
                onClick={handleConfirm}
              >
                {booking.isPending ? t("creating") : t("confirm")}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
