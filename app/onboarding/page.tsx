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
import { getRootDomain } from "@/lib/tenant-host";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const OnboardingPage = () => {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
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
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("successTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {t("successBookingPage")}{" "}
              <span className="font-mono font-semibold">
                {createdSlug}.{getRootDomain()}
              </span>
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              execute({ name, slug, addressLine1, postalCode, city });
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
            <Button type="submit" disabled={isPending}>
              {isPending ? t("submitting") : t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default OnboardingPage;
