"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { getPublicAvailability } from "@/app/_actions/get-public-availability";
import { createPublicBooking } from "@/app/_actions/create-public-booking";
import { createBookingPaymentCheckout } from "@/app/_actions/create-booking-payment-checkout";

type Service = { id: string; name: string; durationMinutes: number; priceInCents: number; currency: string; imageUrl: string | null };
type Staff = { id: string; displayName: string; serviceIds: string[] };

// Extraído do JSX denso do wizard só pra deixar o eslint-disable do <img>
// (foto vem do Cloudinary, fora dos remotePatterns de next/image) em sua
// própria linha — inline no meio da expressão o comentário não é aplicado
// à linha certa.
function ServiceOption({ service, selected, locale, onSelect }: { service: Service; selected: boolean; locale: "de" | "en" | "pt"; onSelect: () => void }) {
  return (
    <button className={`flex items-center gap-3 rounded-lg border p-3 text-left ${selected ? "border-primary" : ""}`} onClick={onSelect}>
      {service.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={service.imageUrl} alt="" className="size-12 shrink-0 rounded-md object-cover" />
      )}
      <span>
        <b>{service.name}</b>
        <span className="ml-2 text-sm text-muted-foreground">
          {new Intl.NumberFormat(locale, { style: "currency", currency: service.currency }).format(service.priceInCents / 100)} · {service.durationMinutes} min
        </span>
      </span>
    </button>
  );
}

export function BookingWizard({ services, staff, locale }: { services: Service[]; staff: Staff[]; locale: "de" | "en" | "pt" }) {
  const t = useTranslations("booking");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? ""); const [staffId, setStaffId] = useState(""); const [date, setDate] = useState(""); const [slot, setSlot] = useState<Date>(); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const availability = useAction(getPublicAvailability); const booking = useAction(createPublicBooking); const checkout = useAction(createBookingPaymentCheckout);
  const eligibleStaff = staff.filter((member) => member.serviceIds.includes(serviceId));
  async function loadSlots() { if (serviceId && date) await availability.executeAsync({ serviceId, staffId: staffId || undefined, dateISO: date }); }
  async function submit() { if (!serviceId || !staffId || !slot) return; const result = await booking.executeAsync({ serviceId, staffId, startAt: slot, customer: { name, email, phone: phone || undefined, locale } }); if (result.data?.status === "PENDING_PAYMENT") { const payment = await checkout.executeAsync({ bookingId: result.data.id }); if (payment.data?.url) window.location.assign(payment.data.url); } }
  return <div className="mx-auto grid max-w-2xl gap-6 p-6"><section><h2 className="text-xl font-semibold">{t("chooseService")}</h2><div className="mt-3 grid gap-2">{services.map((service) => <ServiceOption key={service.id} service={service} locale={locale} selected={serviceId === service.id} onSelect={() => { setServiceId(service.id); setStaffId(""); setSlot(undefined); }} />)}</div></section><section><h2 className="text-xl font-semibold">{t("staffAndTime")}</h2><div className="mt-3 flex flex-wrap gap-2">{eligibleStaff.map((member) => <button className={`rounded-md border px-3 py-2 ${staffId === member.id ? "border-primary" : ""}`} key={member.id} onClick={() => setStaffId(member.id)}>{member.displayName}</button>)}</div><div className="mt-3 flex gap-2"><input className="rounded-md border p-2" type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} /><button className="rounded-md bg-primary px-3 text-primary-foreground" onClick={loadSlots}>{t("viewSlots")}</button></div><div className="mt-3 flex flex-wrap gap-2">{availability.result.data?.map((item) => <button key={item.startAt.toISOString()} className={`rounded-md border px-3 py-2 ${slot?.getTime() === item.startAt.getTime() ? "border-primary" : ""}`} onClick={() => { setSlot(item.startAt); if (!staffId) setStaffId(item.staffIds[0]); }}>{item.time}</button>)}</div></section><section><h2 className="text-xl font-semibold">{t("yourData")}</h2><div className="mt-3 grid gap-2"><input className="rounded-md border p-2" placeholder={t("namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} /><input className="rounded-md border p-2" type="email" placeholder={t("emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} /><input className="rounded-md border p-2" placeholder={t("phonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} /><button disabled={!name || !email || !slot || !staffId || booking.isPending} className="rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50" onClick={submit}>{booking.isPending ? t("booking") : t("confirmBooking")}</button></div></section><footer className="border-t pt-4 text-xs text-muted-foreground">{t("cookieNoticePrefix")} <a className="underline" href="legal/privacy">{t("privacyPolicyLink")}</a>.</footer></div>;
}
