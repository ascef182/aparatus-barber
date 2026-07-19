"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { toggleDirectoryListing } from "@/app/_actions/manage-operations";

export function DirectoryListingForm({
  initialIsListed,
  cities,
}: {
  initialIsListed: boolean;
  cities: string[];
}) {
  const t = useTranslations("dashboard.settings");
  const [isListed, setIsListed] = useState(initialIsListed);

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
    action.execute({ isListed: next });
  }

  return (
    <div className="grid max-w-md gap-2">
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
