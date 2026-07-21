"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getTenantUrl } from "@/lib/tenant-host";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { PasswordInput } from "@/app/_components/ui/password-input";
import { GoogleIcon } from "@/app/_components/ui/google-icon";

/**
 * Login/cadastro do cliente final na área de conta do tenant — mesmo
 * Better Auth do staff (app/sign-in/sign-in-form.tsx), mas o callback do
 * Google precisa ser ABSOLUTO apontando pro subdomínio deste tenant
 * (getTenantUrl), já que estamos numa página servida em {slug}.{root} e
 * um callbackURL relativo resolveria contra o domínio raiz.
 */
export function CustomerSignInForm({ slug, organizationName }: { slug: string; organizationName: string }) {
  const t = useTranslations("account.signIn");
  const tCommon = useTranslations("common");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
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
    if (mode === "signUp") {
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
      window.location.assign("/account");
      return;
    }
    const result = await authClient.signIn.email({ email, password });
    setIsPending(false);
    if (result.error) {
      toast.error(result.error.status === 401 ? t("invalidCredentials") : t("genericError"));
      return;
    }
    window.location.assign("/account");
  }

  async function onGoogleClick() {
    setIsGooglePending(true);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: getTenantUrl(slug, "/account") });
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
        <CardTitle>{mode === "signIn" ? t("title") : t("signUpTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("subtitle", { name: organizationName })}</p>
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
          {mode === "signUp" && (
            <div className="grid gap-2">
              <Label htmlFor="account-name">{t("nameLabel")}</Label>
              <Input id="account-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="account-email">{t("emailLabel")}</Label>
            <Input
              id="account-email"
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
            id="account-password"
            label={t("passwordLabel")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "signUp" ? "new-password" : "current-password"}
            minLength={mode === "signUp" ? 8 : undefined}
            required
          />
          {emailInUse && <p className="text-xs text-destructive">{t("emailInUse")}</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? t("submitting") : mode === "signIn" ? t("submit") : t("submitSignUp")}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          {mode === "signIn" ? (
            <>
              {t("noAccountPrefix")}{" "}
              <button type="button" className="underline" onClick={() => setMode("signUp")}>
                {t("noAccountLink")}
              </button>
            </>
          ) : (
            <>
              {t("hasAccountPrefix")}{" "}
              <button type="button" className="underline" onClick={() => setMode("signIn")}>
                {t("hasAccountLink")}
              </button>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
