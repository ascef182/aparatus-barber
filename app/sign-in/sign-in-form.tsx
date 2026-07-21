"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { PasswordInput } from "@/app/_components/ui/password-input";
import { GoogleIcon } from "@/app/_components/ui/google-icon";

/**
 * Depois de signIn bem-sucedido, recarrega — o server component
 * (app/sign-in/page.tsx) reavalia a sessão e decide para onde ir (mesmo
 * padrão de ClaimAccountForm/AcceptInvitationAuthForm).
 */
export function SignInForm() {
  const t = useTranslations("signIn");
  const tSignUp = useTranslations("signUp");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    const result = await authClient.signIn.email({ email, password });
    setIsPending(false);
    if (result.error) {
      toast.error(result.error.status === 401 ? t("invalidCredentials") : t("genericError"));
      return;
    }
    window.location.reload();
  }

  async function onGoogleClick() {
    setIsGooglePending(true);
    // signIn.social NÃO redireciona sozinho — devolve { url, redirect } e
    // quem chamou precisa navegar manualmente (mesma pegadinha do sign-up).
    // callbackURL volta para /sign-in (não /onboarding) para que a lógica de
    // listOrganizationsForUser em app/sign-in/page.tsx decida o destino certo
    // — sem isso, um usuário já cadastrado que entra via Google sempre caía
    // no wizard de onboarding como se fosse novo.
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/sign-in" });
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
          {tSignUp("googleCta")}
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          {tSignUp("orDivider")}
          <div className="h-px flex-1 bg-border" />
        </div>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="signin-email">{t("emailLabel")}</Label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <PasswordInput
              id="signin-password"
              label={t("passwordLabel")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <Link href="/forgot-password" className="mt-1 block text-right text-xs text-muted-foreground underline">Esqueci minha senha</Link>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("signingIn") : t("submit")}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          {t("noAccountPrefix")}{" "}
          <Link href="/sign-up" className="underline">
            {t("noAccountLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
