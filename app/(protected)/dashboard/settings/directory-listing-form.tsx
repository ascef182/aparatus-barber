"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { toggleDirectoryListing } from "@/app/_actions/manage-operations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";

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

  function toggle() {
    const next = !isListed;
    setIsListed(next);
    action.execute({ isListed: next, category });
  }

  function changeCategory(value: string) {
    const next = value as (typeof BUSINESS_CATEGORIES)[number];
    setCategory(next);
    action.execute({ isListed, category: next });
  }

  return (
    <div className="grid max-w-md gap-3">
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">{tCategories("label")}</span>
        <Select value={category} onValueChange={changeCategory} disabled={action.isPending}>
          <SelectTrigger className="w-full">
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
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isListed} onChange={toggle} disabled={action.isPending} />
        {t("directoryToggleLabel")}
      </label>
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
