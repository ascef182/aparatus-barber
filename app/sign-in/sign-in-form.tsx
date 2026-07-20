"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";

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
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/onboarding" });
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
          {tSignUp("googleCta")}
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          {tSignUp("orDivider")}
          <div className="h-px flex-1 bg-border" />
        </div>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div>
            <label className="text-xs text-muted-foreground">{t("emailLabel")}</label>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("passwordLabel")}</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
