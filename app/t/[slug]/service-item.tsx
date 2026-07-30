"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { de, enUS, ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Separator } from "@/app/_components/ui/separator";
import { Calendar } from "@/app/_components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/app/_components/ui/sheet";
import { getPublicAvailability } from "@/app/_actions/get-public-availability";
import { createPublicBooking } from "@/app/_actions/create-public-booking";
import { publicBookingCustomerSchema } from "@/app/_actions/create-public-booking.schemas";
import { createBookingPaymentCheckout } from "@/app/_actions/create-booking-payment-checkout";
import { validateCouponAction } from "@/app/_actions/validate-coupon";
import type { AvailableSlot } from "@/lib/scheduling/availability";

type Service = { id: string; name: string; durationMinutes: number; priceInCents: number; currency: string; imageUrl: string | null };
type Staff = { id: string; displayName: string; serviceIds: string[] };
type Locale = "de" | "en" | "pt";

const DATE_FNS_LOCALES: Record<Locale, typeof ptBR> = { de, en: enUS, pt: ptBR };

/**
 * Card de serviço + Sheet de reserva — recriação do fluxo do Aparatus
 * original (git show <checkpoint>^:app/_components/service-item.tsx),
 * adaptado pro booking de convidado (sem login) da nova arquitetura
 * multi-tenant: coleta nome/e-mail/telefone no lugar do gate de login,
 * e usa as actions públicas com contexto de tenant resolvido pelo host.
 */
export function ServiceItem({
  service,
  eligibleStaff,
  organizationName,
  locale,
}: {
  service: Service;
  eligibleStaff: Staff[];
  organizationName: string;
  locale: Locale;
}) {
  const t = useTranslations("booking");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"datetime" | "details">("datetime");
  const [confirmed, setConfirmed] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<AvailableSlot | undefined>();
  const [staffId, setStaffId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });
  const [slotConflictError, setSlotConflictError] = useState(false);
  const [alternativeSlots, setAlternativeSlots] = useState<AvailableSlot[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountInCents: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const availability = useAction(getPublicAvailability);
  const booking = useAction(createPublicBooking);
  const checkout = useAction(createBookingPaymentCheckout);
  const couponValidation = useAction(validateCouponAction);

  // Mesma validação da action (create-public-booking.schemas.ts) rodada no
  // cliente pra dar feedback inline antes do submit — sem duplicar as regras
  // de negócio, ambos importam o mesmo schema. As mensagens do Zod em si são
  // fixas em português (não passam por next-intl), então aqui só usamos o
  // schema pra decidir SE cada campo é válido; a mensagem exibida vem de
  // t(), escolhida por uma checagem equivalente à regra que falhou.
  const validation = publicBookingCustomerSchema.safeParse({ name, email, phone: phone || undefined });
  function fieldError(field: "name" | "email" | "phone"): string | undefined {
    if (!touched[field] || validation.success) return undefined;
    if (!validation.error.issues.some((issue) => issue.path[0] === field)) return undefined;
    if (field === "name") return name.trim().length < 2 ? t("nameTooShort") : t("nameInvalidChars");
    if (field === "email") return t("emailInvalid");
    return t("phoneInvalidChars");
  }
  const markTouched = (field: "name" | "email" | "phone") => setTouched((prev) => ({ ...prev, [field]: true }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  async function handleDateSelect(value: Date | undefined) {
    setDate(value);
    setSlot(undefined);
    setStaffId("");
    if (value) await availability.executeAsync({ serviceId: service.id, dateISO: format(value, "yyyy-MM-dd") });
  }

  function handleSlotSelect(item: AvailableSlot) {
    setSlot(item);
    setStaffId(item.staffIds[0] ?? "");
  }

  const COUPON_REASON_KEYS = {
    invalid: "couponReasonInvalid",
    not_yet_valid: "couponReasonNotYetValid",
    expired: "couponReasonExpired",
    exhausted: "couponReasonExhausted",
    wrong_service: "couponReasonWrongService",
  } as const;

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponError(null);
    const result = await couponValidation.executeAsync({ code: couponCode.trim(), serviceId: service.id });
    if (result.serverError || !result.data) {
      setCouponError(t("couponGenericError"));
      return;
    }
    if (!result.data.valid) {
      setCouponError(t(COUPON_REASON_KEYS[result.data.reasonCode]));
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon({ code: couponCode.trim(), discountInCents: result.data.discountInCents });
  }

  async function handleConfirm() {
    if (!slot || !staffId || !name || !email) return;
    const result = await booking.executeAsync({
      serviceId: service.id,
      staffId,
      startAt: slot.startAt,
      customer: { name, email, phone: phone || undefined, locale },
      couponCode: appliedCoupon?.code,
    });
    if (result.serverError || result.validationErrors) {
      // Se foi erro de slot indisponível, carrega alternativas
      if (result.serverError?.includes("horário")) {
        setSlotConflictError(true);
        // Carrega slots para a mesma data para oferecer alternativas
        if (date) {
          const alts = await availability.executeAsync({
            serviceId: service.id,
            dateISO: format(date, "yyyy-MM-dd"),
          });
          if (alts.data) {
            // Pega os primeiros 3 slots diferentes do que foi selecionado
            const suggested = alts.data
              .filter((s) => s.startAt.getTime() !== slot.startAt.getTime())
              .slice(0, 3);
            setAlternativeSlots(suggested);
          }
        }
      } else {
        toast.error(result.serverError ?? t("bookingError"));
      }
      return;
    }
    if (!result.data) return;

    if (result.data.status === "PENDING_PAYMENT") {
      const payment = await checkout.executeAsync({ bookingId: result.data.id });
      if (payment.serverError || !payment.data?.url) {
        toast.error(payment.serverError ?? t("paymentError"));
        return;
      }
      window.location.assign(payment.data.url);
      return;
    }

    setConfirmed(true);
    setSlotConflictError(false);
    toast.success(t("bookingConfirmedTitle"));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setStep("datetime");
      setConfirmed(false);
      setDate(undefined);
      setSlot(undefined);
      setStaffId("");
      setName("");
      setEmail("");
      setPhone("");
      setTouched({ name: false, email: false, phone: false });
      setCouponCode("");
      setAppliedCoupon(null);
      setCouponError(null);
    }
  }

  const currencyFormatter = new Intl.NumberFormat(locale, { style: "currency", currency: service.currency });
  const priceLabel = currencyFormatter.format(service.priceInCents / 100);
  const discountedPriceLabel = appliedCoupon
    ? currencyFormatter.format(Math.max(0, service.priceInCents - appliedCoupon.discountInCents) / 100)
    : null;
  const formattedDate = date ? format(date, "d MMM", { locale: DATE_FNS_LOCALES[locale] }) : "";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <div className="flex items-center gap-3 rounded-2xl border p-3">
        {service.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- vem do Cloudinary, fora dos remotePatterns de next/image
          <img src={service.imageUrl} alt="" className="size-[72px] shrink-0 rounded-lg object-cover" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate font-semibold">{service.name}</p>
          <p className="text-sm text-muted-foreground">
            {priceLabel} · {service.durationMinutes} min
          </p>
        </div>
        <SheetTrigger asChild>
          <Button className="shrink-0 rounded-full" disabled={eligibleStaff.length === 0}>
            {t("reserve")}
          </Button>
        </SheetTrigger>
      </div>

      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-sm">
        {confirmed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-lg font-semibold">{t("bookingConfirmedTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("bookingConfirmedBody")}</p>
            <Button onClick={() => setOpen(false)}>{t("close")}</Button>
          </div>
        ) : step === "datetime" ? (
          <div className="flex flex-col gap-6">
            <SheetHeader className="px-5 pt-6">
              <SheetTitle className="text-lg font-bold">{t("makeReservation")}</SheetTitle>
            </SheetHeader>

            <div className="px-5">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                disabled={{ before: today }}
                locale={DATE_FNS_LOCALES[locale]}
                className="w-full p-0"
              />
            </div>

            {date && (
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
                        data-testid="availability-slot"
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
        ) : slotConflictError ? (
          <div className="flex flex-col gap-6">
            <SheetHeader className="px-5 pt-6">
              <SheetTitle className="text-lg font-bold">{t("slotUnavailable")}</SheetTitle>
            </SheetHeader>

            <div className="px-5">
              <p className="text-center text-sm text-muted-foreground">{t("slotUnavailableMessage")}</p>
            </div>

            {alternativeSlots.length > 0 && (
              <div className="px-5">
                <p className="mb-2 text-sm font-semibold">{t("suggestedSlots")}</p>
                <div className="flex flex-col gap-2">
                  {alternativeSlots.map((item) => (
                    <Button
                      key={item.startAt.toString()}
                      type="button"
                      variant="outline"
                      className="justify-start rounded-lg"
                      onClick={() => {
                        setSlot(item);
                        setStaffId(item.staffIds[0] ?? "");
                        setSlotConflictError(false);
                        setAlternativeSlots([]);
                      }}
                    >
                      <span className="text-base font-semibold">{item.time}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 pb-6">
              <Button
                className="w-full rounded-full"
                variant="outline"
                onClick={() => {
                  setStep("datetime");
                  setSlotConflictError(false);
                  setAlternativeSlots([]);
                }}
              >
                {t("chooseDifferentDate")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <SheetHeader className="flex-row items-center gap-2 space-y-0 px-5 pt-6">
              <Button size="icon" variant="ghost" className="-ml-2 rounded-full" onClick={() => setStep("datetime")}>
                <ChevronLeft className="size-5" />
                <span className="sr-only">{t("back")}</span>
              </Button>
              <SheetTitle className="text-lg font-bold">{t("makeReservation")}</SheetTitle>
            </SheetHeader>

            <div className="grid gap-3 px-5">
              <div className="grid gap-1.5">
                <Label htmlFor={`${service.id}-name`}>{t("namePlaceholder")}</Label>
                <Input
                  id={`${service.id}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => markTouched("name")}
                  aria-invalid={!!fieldError("name")}
                />
                {fieldError("name") && <p className="text-xs text-destructive">{fieldError("name")}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${service.id}-email`}>{t("emailPlaceholder")}</Label>
                <Input
                  id={`${service.id}-email`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched("email")}
                  aria-invalid={!!fieldError("email")}
                />
                {fieldError("email") && <p className="text-xs text-destructive">{fieldError("email")}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${service.id}-phone`}>{t("phonePlaceholder")}</Label>
                <Input
                  id={`${service.id}-phone`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => markTouched("phone")}
                  aria-invalid={!!fieldError("phone")}
                />
                {fieldError("phone") && <p className="text-xs text-destructive">{fieldError("phone")}</p>}
              </div>
            </div>

            <Separator />

            <div className="px-5">
              <Label htmlFor={`${service.id}-coupon`}>{t("couponLabel")}</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id={`${service.id}-coupon`}
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setAppliedCoupon(null);
                    setCouponError(null);
                  }}
                  placeholder={t("couponPlaceholder")}
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!couponCode.trim() || couponValidation.isPending || !!appliedCoupon}
                  onClick={handleApplyCoupon}
                >
                  {couponValidation.isPending ? t("couponApplying") : t("couponApply")}
                </Button>
              </div>
              {couponError && <p className="mt-1.5 text-xs text-destructive">{couponError}</p>}
              {appliedCoupon && <p className="mt-1.5 text-xs text-primary">{t("couponApplied")}</p>}
            </div>

            <div className="px-5">
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold">{service.name}</p>
                  {discountedPriceLabel ? (
                    <span className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground line-through">{priceLabel}</span>
                      <span className="text-sm font-bold text-primary">{discountedPriceLabel}</span>
                    </span>
                  ) : (
                    <p className="text-sm font-bold">{priceLabel}</p>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <p>{t("summaryDate")}</p>
                  <p>{formattedDate}</p>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <p>{t("summaryTime")}</p>
                  <p>{slot?.time}</p>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <p>{t("summaryBusiness")}</p>
                  <p>{organizationName}</p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-6">
              <Button
                className="w-full rounded-full"
                disabled={!validation.success || booking.isPending || checkout.isPending}
                onClick={handleConfirm}
              >
                {booking.isPending || checkout.isPending ? t("booking") : t("confirmBooking")}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
