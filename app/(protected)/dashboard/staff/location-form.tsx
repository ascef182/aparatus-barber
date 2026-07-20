"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createLocation } from "@/app/_actions/manage-operations";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";

export function LocationForm({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("dashboard.staff");
  const [name, setName] = useState(""); const [addressLine1, setAddressLine1] = useState(""); const [postalCode, setPostalCode] = useState(""); const [city, setCity] = useState("");
  const action = useAction(createLocation, { onSuccess: () => { toast.success(t("locationCreated")); onDone?.(); }, onError: ({ error }) => toast.error(error.serverError ?? error.validationErrors?._errors?.[0] ?? t("createError")) });
  return <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); action.execute({ name, addressLine1, postalCode, city }); }}><Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("locationNamePlaceholder")} required /><Input value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} placeholder={t("locationAddressPlaceholder")} required /><div className="grid grid-cols-2 gap-2"><Input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder={t("locationPostalCodePlaceholder")} required /><Input value={city} onChange={(event) => setCity(event.target.value)} placeholder={t("locationCityPlaceholder")} required /></div><Button type="submit" disabled={action.isPending}>{action.isPending ? "..." : t("createLocation")}</Button></form>;
}
