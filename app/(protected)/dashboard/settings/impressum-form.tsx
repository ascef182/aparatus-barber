"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateImpressum } from "@/app/_actions/manage-operations";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";

type ImpressumData = {
  legalName: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
  representedBy: string;
  phone: string;
  email: string;
  registerCourt: string;
  registerNumber: string;
  vatId: string;
};

const EMPTY: ImpressumData = {
  legalName: "", addressLine1: "", postalCode: "", city: "", country: "DE",
  representedBy: "", phone: "", email: "", registerCourt: "", registerNumber: "", vatId: "",
};

export function ImpressumForm({ initial }: { initial: Partial<ImpressumData> | null }) {
  const t = useTranslations("dashboard.settings");
  const [form, setForm] = useState<ImpressumData>({ ...EMPTY, ...initial });

  const action = useAction(updateImpressum, {
    onSuccess: () => toast.success(t("impressumSaved")),
    onError: ({ error }) => toast.error(error.serverError ?? t("impressumSaveError")),
  });

  function set<K extends keyof ImpressumData>(key: K) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));
  }

  return (
    <form
      className="grid max-w-md gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        action.execute({
          legalName: form.legalName,
          addressLine1: form.addressLine1,
          postalCode: form.postalCode,
          city: form.city,
          country: form.country,
          representedBy: form.representedBy || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          registerCourt: form.registerCourt || undefined,
          registerNumber: form.registerNumber || undefined,
          vatId: form.vatId || undefined,
        });
      }}
    >
      <Input placeholder={t("impressumLegalName")} value={form.legalName} onChange={set("legalName")} required />
      <Input placeholder={t("impressumAddress")} value={form.addressLine1} onChange={set("addressLine1")} required />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder={t("impressumPostalCode")} value={form.postalCode} onChange={set("postalCode")} required />
        <Input placeholder={t("impressumCity")} value={form.city} onChange={set("city")} required />
      </div>
      <Input placeholder={t("impressumCountry")} value={form.country} onChange={set("country")} maxLength={2} required />
      <Input placeholder={t("impressumRepresentedBy")} value={form.representedBy} onChange={set("representedBy")} />
      <Input placeholder={t("impressumPhone")} value={form.phone} onChange={set("phone")} />
      <Input placeholder={t("impressumEmail")} type="email" value={form.email} onChange={set("email")} />
      <Input placeholder={t("impressumRegisterCourt")} value={form.registerCourt} onChange={set("registerCourt")} />
      <Input placeholder={t("impressumRegisterNumber")} value={form.registerNumber} onChange={set("registerNumber")} />
      <Input placeholder={t("impressumVatId")} value={form.vatId} onChange={set("vatId")} />
      <Button type="submit" disabled={action.isPending}>
        {action.isPending ? t("impressumSaving") : t("impressumSave")}
      </Button>
    </form>
  );
}
