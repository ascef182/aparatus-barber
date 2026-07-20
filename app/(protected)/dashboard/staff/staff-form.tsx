"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createStaff, updateStaff } from "@/app/_actions/manage-operations";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { cn } from "@/lib/utils";

type CompensationType = "MONTHLY" | "HOURLY" | "PER_SERVICE_COMMISSION";

type StaffInput = {
  id: string;
  displayName: string;
  jobTitle: string | null;
  locationId: string;
  compensationType: CompensationType | null;
  compensationAmountInCents: number | null;
  commissionBps: number | null;
  serviceIds: string[];
};

export function StaffForm({
  staff,
  locations,
  services,
  onDone,
}: {
  staff?: StaffInput;
  locations: { id: string; name: string }[];
  services: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const t = useTranslations("dashboard.staff");
  const [displayName, setDisplayName] = useState(staff?.displayName ?? "");
  const [jobTitle, setJobTitle] = useState(staff?.jobTitle ?? "");
  const [locationId, setLocationId] = useState(staff?.locationId ?? locations[0]?.id ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(staff?.serviceIds ?? []);
  const [compensationType, setCompensationType] = useState<CompensationType>(staff?.compensationType ?? "MONTHLY");
  const [amount, setAmount] = useState(
    staff
      ? String(((compensationType === "PER_SERVICE_COMMISSION" ? staff.commissionBps : staff.compensationAmountInCents) ?? 0) / 100)
      : "",
  );
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "professional" | "receptionist">("professional");

  const create = useAction(createStaff, {
    onSuccess: () => { toast.success(t("created")); onDone?.(); },
    onError: ({ error }) => toast.error(error.serverError ?? error.validationErrors?._errors?.[0] ?? t("createError")),
  });
  const update = useAction(updateStaff, {
    onSuccess: () => { toast.success(t("updated")); onDone?.(); },
    onError: ({ error }) => toast.error(error.serverError ?? error.validationErrors?._errors?.[0] ?? t("updateError")),
  });
  const pending = create.isPending || update.isPending;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const numeric = Math.round(Number(amount.replace(",", ".")) * 100);
    const shared = {
      displayName,
      jobTitle: jobTitle || undefined,
      locationId,
      serviceIds,
      compensationType,
      compensationAmountInCents: compensationType === "PER_SERVICE_COMMISSION" ? undefined : numeric,
      commissionBps: compensationType === "PER_SERVICE_COMMISSION" ? numeric : undefined,
    };
    if (staff) update.execute({ id: staff.id, ...shared });
    else create.execute({ ...shared, invite: email ? { email, role } : undefined });
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-1.5">
        <Label htmlFor="staff-name">{t("namePlaceholder")}</Label>
        <Input id="staff-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="staff-job-title">{t("jobTitlePlaceholder")}</Label>
        <Input id="staff-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>{t("locationLabel")}</Label>
        <Select value={locationId} onValueChange={setLocationId} required>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <fieldset className="grid gap-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">{t("compensationLegend")}</legend>
        <Select value={compensationType} onValueChange={(value) => setCompensationType(value as CompensationType)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MONTHLY">{t("compensationMonthly")}</SelectItem>
            <SelectItem value="HOURLY">{t("compensationHourly")}</SelectItem>
            <SelectItem value="PER_SERVICE_COMMISSION">{t("compensationCommission")}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder={compensationType === "PER_SERVICE_COMMISSION" ? t("commissionPlaceholder") : t("amountPlaceholder")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </fieldset>
      {!staff && (
        <fieldset className="grid gap-3 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">{t("accessLegend")}</legend>
          <Input type="email" placeholder={t("inviteEmailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select value={role} onValueChange={(value) => setRole(value as typeof role)} disabled={!email}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">{t("roleProfessional")}</SelectItem>
              <SelectItem value="receptionist">{t("roleReceptionist")}</SelectItem>
              <SelectItem value="manager">{t("roleManager")}</SelectItem>
            </SelectContent>
          </Select>
        </fieldset>
      )}
      <div className="grid gap-1.5">
        <Label>{t("servicesPerformed")}</Label>
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
          {services.length === 0 && <p className="text-xs text-muted-foreground">{t("noServicesAssociated")}</p>}
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "..." : staff ? t("saveChanges") : t("createSubmit")}
      </Button>
    </form>
  );
}
