"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { createOrganization } from "@/app/_actions/create-organization";
import { Button } from "@/app/_components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { getRootDomain, getTenantUrl } from "@/lib/tenant-host";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

/**
 * 2 passos: (1) negócio + endereço, (2) info pública (telefone/descrição)
 * + Impressum + DPA. O Impressum entra AQUI (não só depois no dashboard)
 * porque, sem ele, o wizard de agendamento público fica bloqueado para
 * filiais alemãs (ver app/t/[slug]/page.tsx) — sem isso o dono não tinha
 * como saber que precisava preencher algo antes do primeiro cliente.
 */
export function OnboardingWizardForm({ sessionId }: { sessionId?: string }) {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [legalName, setLegalName] = useState("");
  const [representedBy, setRepresentedBy] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [country, setCountry] = useState("DE");
  const [registerCourt, setRegisterCourt] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [vatId, setVatId] = useState("");
  const [dpaAccepted, setDpaAccepted] = useState(false);

  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const { execute, isPending } = useAction(createOrganization, {
    onSuccess: ({ data }) => {
      if (data) setCreatedSlug(data.slug);
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError ??
          error.validationErrors?._errors?.[0] ??
          tCommon("error"),
      );
    },
  });

  if (createdSlug) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("successTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm">
            {t("successBookingPage")}{" "}
            <span className="font-mono font-semibold">
              {createdSlug}.{getRootDomain()}
            </span>
          </p>
          <Button asChild>
            <a href={getTenantUrl(createdSlug, "/dashboard")}>{t("goToDashboard")}</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 1) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!legalName) setLegalName(name);
              setStep(2);
            }}
          >
            <Input
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSlug(slugify(event.target.value));
              }}
              required
            />
            <div className="flex items-center gap-2">
              <Input
                placeholder={t("slugPlaceholder")}
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value))}
                required
              />
              <span className="text-muted-foreground text-sm whitespace-nowrap">
                .{getRootDomain()}
              </span>
            </div>
            <Input
              placeholder={t("addressPlaceholder")}
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              required
            />
            <div className="flex gap-2">
              <Input
                placeholder={t("postalCodePlaceholder")}
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                required
              />
              <Input
                placeholder={t("cityPlaceholder")}
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
              />
            </div>
            <Button type="submit">{t("nextStep")}</Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("step2Title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!dpaAccepted) return;
            execute({
              name, slug, addressLine1, postalCode, city, sessionId, dpaAccepted: true,
              phone: phone || undefined,
              description: description || undefined,
              legalName: legalName || name,
              representedBy: representedBy || undefined,
              contactEmail: contactEmail || undefined,
              country,
              registerCourt: registerCourt || undefined,
              registerNumber: registerNumber || undefined,
              vatId: vatId || undefined,
            });
          }}
        >
          <Input
            placeholder={t("phonePlaceholder")}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Input
            placeholder={t("descriptionPlaceholder")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <p className="mt-2 text-xs font-medium text-muted-foreground">{t("impressumLegend")}</p>
          <Input
            placeholder={t("legalNamePlaceholder")}
            value={legalName}
            onChange={(event) => setLegalName(event.target.value)}
            required
          />
          <Input
            placeholder={t("representedByPlaceholder")}
            value={representedBy}
            onChange={(event) => setRepresentedBy(event.target.value)}
          />
          <Input
            type="email"
            placeholder={t("contactEmailPlaceholder")}
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />
          <Input
            placeholder={t("countryPlaceholder")}
            value={country}
            onChange={(event) => setCountry(event.target.value.toUpperCase())}
            maxLength={2}
            required
          />
          <Input
            placeholder={t("registerCourtPlaceholder")}
            value={registerCourt}
            onChange={(event) => setRegisterCourt(event.target.value)}
          />
          <Input
            placeholder={t("registerNumberPlaceholder")}
            value={registerNumber}
            onChange={(event) => setRegisterNumber(event.target.value)}
          />
          <Input
            placeholder={t("vatIdPlaceholder")}
            value={vatId}
            onChange={(event) => setVatId(event.target.value)}
          />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={dpaAccepted}
              onChange={(event) => setDpaAccepted(event.target.checked)}
              required
            />
            <a href="/dpa" target="_blank" rel="noreferrer" className="underline">
              {t("dpaCheckboxLabel")}
            </a>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              {t("backStep")}
            </Button>
            <Button type="submit" disabled={isPending || !dpaAccepted} className="flex-1">
              {isPending ? t("submitting") : t("submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
