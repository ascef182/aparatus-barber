"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";

export function EditNameForm({ initialName }: { initialName: string }) {
  const t = useTranslations("app.account");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const dirty = name.trim() !== initialName && name.trim().length > 0;

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
    <form className="flex items-end gap-2" onSubmit={handleSubmit}>
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="app-profile-name" className="text-xs text-muted-foreground">
          {t("nameLabel")}
        </Label>
        <Input
          id="app-profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>
      {dirty && (
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? t("saving") : t("save")}
        </button>
      )}
    </form>
  );
}

export function SignOutButton() {
  const t = useTranslations("app.account");
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const result = await authClient.signOut();
    if (result.error) {
      toast.error(result.error.message ?? t("signOutError"));
      setPending(false);
      return;
    }
    window.location.assign("/account/sign-in");
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={signOut}
      className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
    >
      <LogOut className="size-4" />
      {pending ? t("signingOut") : t("signOut")}
    </button>
  );
}
