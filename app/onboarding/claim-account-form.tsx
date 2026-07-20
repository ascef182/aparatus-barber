"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";

/**
 * Passo de "cadastro" do funil pay -> sign up -> onboarding: o e-mail vem
 * travado do Checkout Session (é o que torna o e-mail pago = login). Se a
 * conta já existir, alterna para login com a mesma senha em vez de tentar
 * criar de novo.
 */
export function ClaimAccountForm({ email }: { email: string }) {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signUp" | "signIn">("signUp");
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    let result =
      mode === "signUp"
        ? await authClient.signUp.email({ email, password, name: email.split("@")[0] ?? email })
        : await authClient.signIn.email({ email, password });
    // Conta já existente (ex.: seedada por scripts/dev-create-test-subscription.ts,
    // ou reivindicação repetida): tenta login com a mesma senha na hora, em
    // vez de exigir um segundo clique manual depois de trocar o modo.
    if (result.error && mode === "signUp" && result.error.status === 422) {
      setMode("signIn");
      result = await authClient.signIn.email({ email, password });
    }
    setIsPending(false);
    if (result.error) {
      toast.error(result.error.message ?? tCommon("error"));
      return;
    }
    window.location.reload();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("claimTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("claimSubtitle")}</p>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div>
            <label className="text-xs text-muted-foreground">{t("emailLabel")}</label>
            <Input value={email} disabled readOnly />
            <p className="mt-1 text-xs text-muted-foreground">{t("lockedEmailHint")}</p>
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
              ? isPending ? t("creatingAccount") : t("createAccountSubmit")
              : isPending ? t("signingIn") : t("signInSubmit")}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
          >
            {mode === "signIn" ? t("toggleToSignUp") : t("toggleToSignIn")}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
