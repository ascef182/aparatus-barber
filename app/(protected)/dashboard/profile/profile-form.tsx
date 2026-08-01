"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";

export function ProfileForm({ initialName }: { initialName: string }) {
  const t = useTranslations("dashboard.profile");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await authClient.updateUser({ name: name.trim() });
    setPending(false);
    if (result.error) {
      toast.error(result.error.message ?? t("saveError"));
      return;
    }
    toast.success(t("saved"));
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-1.5">
        <Label htmlFor="staff-profile-name">{t("nameLabel")}</Label>
        <Input id="staff-profile-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <Button type="submit" disabled={pending || !name.trim()} className="justify-self-start">
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
