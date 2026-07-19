"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { logMfaChange } from "@/app/_actions/log-mfa-change";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";

function extractSecret(totpURI: string): string {
  try {
    return new URL(totpURI).searchParams.get("secret") ?? totpURI;
  } catch {
    return totpURI;
  }
}

/**
 * Autoenrollment de MFA (TOTP). Sem QR code (sem dependência nova) — o
 * segredo é mostrado para entrada manual no app autenticador, que todo
 * app relevante (Google/Microsoft/Authy...) suporta como alternativa ao
 * scan. Enforcement é hoje só um banner (ver dashboard/layout.tsx) — um
 * redirect obrigatório sem esse fluxo já validado em produção arriscaria
 * trancar owners fora do próprio dashboard.
 */
export function SecuritySection({ twoFactorEnabled }: { twoFactorEnabled: boolean }) {
  const t = useTranslations("dashboard.settings");
  const [step, setStep] = useState<"idle" | "password" | "verify">("idle");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [enabled, setEnabled] = useState(twoFactorEnabled);
  const [isPending, setIsPending] = useState(false);

  async function startEnable(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    const result = await authClient.twoFactor.enable({ password });
    setIsPending(false);
    if (result.error) {
      toast.error(result.error.message ?? t("wrongPassword"));
      return;
    }
    setSecret(extractSecret(result.data.totpURI));
    setBackupCodes(result.data.backupCodes);
    setStep("verify");
  }

  async function confirmVerify(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    const result = await authClient.twoFactor.verifyTotp({ code });
    setIsPending(false);
    if (result.error) {
      toast.error(t("invalidCode"));
      return;
    }
    setEnabled(true);
    setStep("idle");
    toast.success(t("twoFactorEnabled"));
    void logMfaChange({ enabled: true }).catch(() => {});
  }

  async function disable() {
    const pwd = window.prompt(t("disablePrompt"));
    if (!pwd) return;
    const result = await authClient.twoFactor.disable({ password: pwd });
    if (result.error) {
      toast.error(result.error.message ?? t("wrongPassword"));
      return;
    }
    setEnabled(false);
    toast.success(t("twoFactorDisabled"));
    void logMfaChange({ enabled: false }).catch(() => {});
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{t("securityTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {t("twoFactorLabel")}{" "}
          <span className={enabled ? "text-green-600" : "text-amber-600"}>
            {enabled ? t("twoFactorActive") : t("twoFactorInactive")}
          </span>
        </p>

        {enabled && (
          <Button variant="outline" onClick={disable}>
            {t("disable2fa")}
          </Button>
        )}

        {!enabled && step === "idle" && (
          <Button onClick={() => setStep("password")}>{t("enable2fa")}</Button>
        )}

        {!enabled && step === "password" && (
          <form className="flex flex-col gap-2" onSubmit={startEnable}>
            <Input
              type="password"
              placeholder={t("yourPassword")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "..." : t("continueLabel")}
            </Button>
          </form>
        )}

        {!enabled && step === "verify" && secret && (
          <form className="flex flex-col gap-3" onSubmit={confirmVerify}>
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <p className="mb-1 text-muted-foreground">
                {t("addManually")}
              </p>
              <p className="font-mono break-all">{secret}</p>
            </div>
            {backupCodes && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <p className="mb-1 text-muted-foreground">
                  {t("backupCodesHint")}
                </p>
                <p className="font-mono break-all">{backupCodes.join(" · ")}</p>
              </div>
            )}
            <Input
              placeholder={t("sixDigitCode")}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={6}
              required
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "..." : t("confirm")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
