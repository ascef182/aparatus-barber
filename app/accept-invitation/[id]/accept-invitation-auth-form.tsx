"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";

/**
 * Mesmo padrão de app/onboarding/claim-account-form.tsx: e-mail travado
 * (o do convite), alterna para login se a conta já existir. Depois de
 * signUp/signIn, recarrega — o server component reavalia a sessão e mostra
 * o botão de confirmação (AcceptInvitationConfirm).
 */
export function AcceptInvitationAuthForm({
  email,
  organizationName,
}: {
  email: string;
  organizationName: string;
}) {
  const t = useTranslations("invitation");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signUp" | "signIn">("signUp");
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    const result =
      mode === "signUp"
        ? await authClient.signUp.email({ email, password, name: email.split("@")[0] ?? email })
        : await authClient.signIn.email({ email, password });
    setIsPending(false);
    if (result.error) {
      if (mode === "signUp" && result.error.status === 422) {
        setMode("signIn");
        toast.info(t("accountExists"));
        return;
      }
      toast.error(result.error.message ?? t("genericError"));
      return;
    }
    window.location.reload();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("inviteFor", { organizationName })}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {mode === "signUp" ? t("createPasswordPrompt") : t("signInPrompt")}
        </p>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div>
            <label className="text-xs text-muted-foreground">{t("emailLabel")}</label>
            <Input value={email} disabled readOnly />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("passwordLabel")}</label>
            <Input
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {mode === "signUp"
              ? isPending ? t("creatingAccount") : t("createAndContinue")
              : isPending ? t("signingIn") : t("signIn")}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
          >
            {mode === "signIn" ? t("noAccountYet") : t("alreadyHaveAccount")}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
