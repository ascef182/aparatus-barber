"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getRootUrl } from "@/lib/tenant-host";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { PasswordInput } from "@/app/_components/ui/password-input";
import { GoogleIcon } from "@/app/_components/ui/google-icon";

/**
 * Entrada do funil grátis (sem Checkout Stripe antes): cria o User via
 * e-mail+senha ou Google. Depois disso, /onboarding decide o próximo passo
 * (wizard direto, já que não há session_id).
 */
export function SignUpForm({ plan }: { plan?: string }) {
  const onboardingUrl = plan ? `/onboarding?plan=${plan}` : "/onboarding";
  const t = useTranslations("signUp");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [emailInUse, setEmailInUse] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setEmailInUse(false);
    const result = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] || email });
    setIsPending(false);
    if (result.error) {
      if (result.error.status === 422) {
        setEmailInUse(true);
        return;
      }
      toast.error(result.error.message ?? tCommon("error"));
      return;
    }
    window.location.assign(onboardingUrl);
  }

  async function onGoogleClick() {
    setIsGooglePending(true);
    // signIn.social NÃO redireciona sozinho — devolve { url, redirect } e
    // quem chamou é responsável por navegar (sem isso, o botão parece não
    // fazer nada: o POST vai, volta 200, mas a tela não sai do lugar).
    const result = await authClient.signIn.social({ provider: "google", callbackURL: onboardingUrl });
    if (result.error || !result.data?.url) {
      setIsGooglePending(false);
      toast.error(result.error?.message ?? tCommon("error"));
      return;
    }
    window.location.href = result.data.url;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button type="button" variant="outline" disabled={isGooglePending} onClick={onGoogleClick}>
          <GoogleIcon className="size-4" />
          {t("googleCta")}
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          {t("orDivider")}
          <div className="h-px flex-1 bg-border" />
        </div>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="signup-name">{t("nameLabel")}</Label>
            <Input
              id="signup-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="signup-email">{t("emailLabel")}</Label>
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailInUse(false);
              }}
              autoComplete="email"
              required
            />
          </div>
          <PasswordInput
            id="signup-password"
            label={t("passwordLabel")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          {emailInUse && (
            <p className="text-xs text-destructive">
              {t("emailInUse")}{" "}
              <Link href={getRootUrl("/sign-in")} className="underline">
                {t("goToSignIn")}
              </Link>
            </p>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? t("creatingAccount") : t("submit")}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          {t("alreadyHavePrefix")}{" "}
          <Link href={getRootUrl("/sign-in")} className="underline">
            {t("goToSignIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
