"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { toggleDirectoryListing, updateBusinessCategory } from "@/app/_actions/manage-operations";
import { Label } from "@/app/_components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { Switch } from "@/app/_components/ui/switch";

const BUSINESS_CATEGORIES = [
  "BARBERSHOP", "HAIR_SALON", "NAIL_SALON", "BEAUTY_SALON",
  "MEDICAL", "DENTAL", "ELECTRICIAN", "CONSTRUCTION", "OTHER",
] as const;

export function DirectoryListingForm({
  initialIsListed,
  initialCategory,
  cities,
}: {
  initialIsListed: boolean;
  initialCategory: (typeof BUSINESS_CATEGORIES)[number];
  cities: string[];
}) {
  const t = useTranslations("dashboard.settings");
  const tCategories = useTranslations("businessCategories");
  const [isListed, setIsListed] = useState(initialIsListed);
  const [category, setCategory] = useState(initialCategory);

  const action = useAction(toggleDirectoryListing, {
    onSuccess: () => toast.success(t("directorySaved")),
    onError: ({ error }) => {
      setIsListed((current) => !current);
      toast.error(error.serverError ?? t("directorySaveError"));
    },
  });
  const categoryAction = useAction(updateBusinessCategory, {
    onSuccess: () => toast.success(t("directorySaved")),
    onError: ({ error }) => toast.error(error.serverError ?? t("directorySaveError")),
  });

  function toggle() {
    const next = !isListed;
    setIsListed(next);
    action.execute({ isListed: next });
  }

  function changeCategory(value: string) {
    const next = value as (typeof BUSINESS_CATEGORIES)[number];
    setCategory(next);
    categoryAction.execute({ category: next });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="directory-category">{tCategories("label")}</Label>
        <Select value={category} onValueChange={changeCategory} disabled={categoryAction.isPending}>
          <SelectTrigger id="directory-category" className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value}>
                {tCategories(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="directory-listed" checked={isListed} onCheckedChange={toggle} disabled={action.isPending} />
        <Label htmlFor="directory-listed">{t("directoryToggleLabel")}</Label>
      </div>
      <p className="text-sm text-muted-foreground">{t("directoryToggleHelp")}</p>
      {isListed && (
        <p className="text-sm text-muted-foreground">
          {cities.length
            ? t("directoryCitiesPreview", { cities: cities.join(", ") })
            : t("directoryNoCities")}
        </p>
      )}
    </div>
  );
}
