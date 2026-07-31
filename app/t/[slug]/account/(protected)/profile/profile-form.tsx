"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateProfileAction } from "@/app/_actions/update-profile";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";

export function ProfileForm({
  initialName,
  initialEmail,
  initialPhone,
}: {
  initialName: string;
  initialEmail: string | null;
  initialPhone: string | null;
}) {
  const t = useTranslations("account.profile");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");

  const update = useAction(updateProfileAction, {
    onSuccess: () => {
      toast.success(t("saved"));
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? t("saveError")),
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        update.execute({
          name,
          email: email.trim() || null,
          phone: phone.trim() || null,
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="profile-name">{t("nameLabel")}</Label>
        <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="profile-email">{t("emailLabel")}</Label>
        <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="profile-phone">{t("phoneLabel")}</Label>
        <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <Button type="submit" disabled={update.isPending} className="justify-self-start">
        {update.isPending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
