"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Separator } from "@/app/_components/ui/separator";
import { Calendar } from "@/app/_components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/app/_components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { getPublicAvailability } from "@/app/_actions/get-public-availability";
import { createCustomerBooking } from "@/app/_actions/create-customer-booking";
import { createBookingPaymentCheckout } from "@/app/_actions/create-booking-payment-checkout";
import type { AvailableSlot } from "@/lib/scheduling/availability";

type Service = { id: string; name: string; durationMinutes: number };
type Staff = { id: string; displayName: string; serviceIds: string[] };

/** Reserva pelo cliente já logado na área de conta — identidade vem da
 * sessão (createCustomerBooking usa customerActionClient), então não há
 * passo de nome/e-mail/telefone como no wizard público. */
export function NewCustomerBookingSheet({ services, staff }: { services: Service[]; staff: Staff[] }) {
  const t = useTranslations("account.bookings.newBooking");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<AvailableSlot | undefined>();

  const availability = useAction(getPublicAvailability);
  const checkout = useAction(createBookingPaymentCheckout);
  const booking = useAction(createCustomerBooking, {
    onSuccess: async ({ data }) => {
      if (!data) return;
      if (data.status === "PENDING_PAYMENT") {
        const payment = await checkout.executeAsync({ bookingId: data.id });
        if (payment.serverError || !payment.data?.url) {
          toast.error(payment.serverError ?? t("createError"));
          return;
        }
        window.location.assign(payment.data.url);
        return;
      }
      toast.success(t("created"));
      handleOpenChange(false);
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? t("createError")),
  });

  const eligibleStaff = serviceId ? staff.filter((member) => member.serviceIds.includes(serviceId)) : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  async function handleDateSelect(value: Date | undefined) {
    setDate(value);
    setSlot(undefined);
    if (value && serviceId) {
      await availability.executeAsync({ serviceId, staffId: staffId || undefined, dateISO: format(value, "yyyy-MM-dd") });
    }
  }

  function handleSlotSelect(item: AvailableSlot) {
    setSlot(item);
    if (!staffId) setStaffId(item.staffIds[0] ?? "");
  }

  function handleConfirm() {
    if (!slot || !serviceId) return;
    const resolvedStaffId = staffId || slot.staffIds[0];
    if (!resolvedStaffId) return;
    booking.execute({ serviceId, staffId: resolvedStaffId, startAt: slot.startAt });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setServiceId("");
      setStaffId("");
      setDate(undefined);
      setSlot(undefined);
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
        <div className="flex flex-col gap-6">
          <SheetHeader className="px-5 pt-6">
            <SheetTitle className="text-lg font-bold">{t("title")}</SheetTitle>
          </SheetHeader>

          <div className="grid gap-3 px-5">
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
                <SelectValue placeholder={t("chooseService")} />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {serviceId && eligibleStaff.length > 1 && (
              <Select
                value={staffId}
                onValueChange={(value) => {
                  setStaffId(value);
                  setSlot(undefined);
                  if (date) void handleDateSelect(date);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("chooseStaff")} />
                </SelectTrigger>
                <SelectContent>
                  {eligibleStaff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {serviceId && (
            <div className="px-5">
              <Calendar mode="single" selected={date} onSelect={handleDateSelect} disabled={{ before: today }} className="w-full p-0" />
            </div>
          )}

          {date && serviceId && (
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
            <Button className="w-full rounded-full" disabled={!slot || booking.isPending || checkout.isPending} onClick={handleConfirm}>
              {booking.isPending || checkout.isPending ? t("creating") : t("confirm")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
