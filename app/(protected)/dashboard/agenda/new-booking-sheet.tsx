"use client";

import { useState } from "react";
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
import type { AvailableSlot } from "@/lib/scheduling/availability";

type Service = { id: string; name: string; durationMinutes: number };
type Staff = { id: string; displayName: string; serviceIds: string[] };

/** Reserva manual/walk-in pelo staff — mesmo padrão de Sheet do wizard
 * público (app/t/[slug]/service-item.tsx), adaptado pra escolher serviço e
 * profissional em vez de já vir de um card fixo. */
export function NewBookingSheet({ services, staff }: { services: Service[]; staff: Staff[] }) {
  const t = useTranslations("dashboard.agenda.newBooking");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"setup" | "details">("setup");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<AvailableSlot | undefined>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const availability = useAction(getDashboardAvailability);
  const booking = useAction(createManualBooking, {
    onSuccess: () => {
      toast.success(t("created"));
      handleOpenChange(false);
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

              {serviceId && (
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

            {serviceId && (
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
