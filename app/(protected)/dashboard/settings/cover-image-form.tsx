"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateCoverImage } from "@/app/_actions/manage-operations";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Button } from "@/app/_components/ui/button";

export function CoverImageForm({ initialCoverImageUrl }: { initialCoverImageUrl: string | null }) {
  const t = useTranslations("dashboard.settings");
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl);
  const [uploading, setUploading] = useState(false);

  const action = useAction(updateCoverImage, {
    onSuccess: () => toast.success(t("coverImageSaved")),
    onError: ({ error }) => toast.error(error.serverError ?? t("coverImageSaveError")),
  });

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("kind", "cover");
      const response = await fetch("/api/media/upload", { method: "POST", body });
      if (!response.ok) throw new Error();
      const { url } = (await response.json()) as { url: string };
      setCoverImageUrl(url);
      action.execute({ coverImageUrl: url });
    } catch {
      toast.error(t("coverImageUploadError"));
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    setCoverImageUrl(null);
    action.execute({ coverImageUrl: null });
  }

  return (
    <div className="grid max-w-md gap-2">
      <Label htmlFor="cover-image">{t("coverImageLabel")}</Label>
      <p className="text-sm text-muted-foreground">{t("coverImageHint")}</p>
      {coverImageUrl && (
        <div className="relative w-full overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element -- vem do Cloudinary, fora dos remotePatterns de next/image */}
          <img src={coverImageUrl} alt="" className="aspect-[3/1] w-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute right-2 top-2"
            onClick={remove}
            disabled={action.isPending}
          >
            {t("removeCoverImage")}
          </Button>
        </div>
      )}
      <Input id="cover-image" type="file" accept="image/*" disabled={uploading || action.isPending} onChange={(e) => upload(e.target.files)} />
    </div>
  );
}
