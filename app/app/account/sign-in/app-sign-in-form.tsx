"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getTenantUrl } from "@/lib/tenant-host";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { PasswordInput } from "@/app/_components/ui/password-input";
import { GoogleIcon } from "@/app/_components/ui/google-icon";

/**
 * Login/cadastro do app de descoberta (app.{root}) — mesmo Better Auth do
 * app/t/[slug]/account/sign-in/customer-sign-in-form.tsx, mas
 * tenant-agnóstico: não há slug aqui, então o callback do Google usa
 * getTenantUrl("app", ...) ("app" é só mais um subdomínio pra fins de URL).
 */
export function AppSignInForm() {
  const t = useTranslations("app.signIn");
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
    const result = await authClient.signIn.social({ provider: "google", callbackURL: getTenantUrl("app", "/account") });
    if (result.error || !result.data?.url) {
      setIsGooglePending(false);
      toast.error(result.error?.message ?? tCommon("error"));
      return;
    }
    window.location.href = result.data.url;
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">{mode === "signIn" ? t("title") : t("signUpTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="flex flex-col gap-4">
        <Button type="button" variant="outline" disabled={isGooglePending} onClick={onGoogleClick} className="rounded-full">
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
              <Label htmlFor="app-account-name">{t("nameLabel")}</Label>
              <Input
                id="app-account-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="rounded-xl"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="app-account-email">{t("emailLabel")}</Label>
            <Input
              id="app-account-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailInUse(false);
              }}
              autoComplete="email"
              required
              className="rounded-xl"
            />
          </div>
          <PasswordInput
            id="app-account-password"
            label={t("passwordLabel")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "signUp" ? "new-password" : "current-password"}
            minLength={mode === "signUp" ? 8 : undefined}
            required
            className="rounded-xl"
          />
          {emailInUse && <p className="text-xs text-destructive">{t("emailInUse")}</p>}
          <Button type="submit" disabled={isPending} className="rounded-full">
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
      </div>
    </div>
  );
}
