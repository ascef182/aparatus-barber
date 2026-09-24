"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";

/**
 * Passo de verificação pós-login para contas com 2FA ativo. Reusado pelas
 * três telas de login (dashboard, app de descoberta, conta do cliente por
 * tenant) porque authClient.signIn.email() devolve { twoFactorRedirect: true,
 * error: null } nesse caso — sem isso o form original trataria como sucesso
 * e recarregaria sem sessão nenhuma (ver comentário em cada sign-in-form).
 */
export function TwoFactorVerifyForm({ onVerified }: { onVerified: () => void }) {
  const t = useTranslations("twoFactorVerify");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    const result = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    setIsPending(false);
    if (result.error) {
      toast.error(t("invalidCode"));
      return;
    }
    onVerified();
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="two-factor-code">
          {useBackupCode ? t("backupCodeLabel") : t("codeLabel")}
        </Label>
        <Input
          id="two-factor-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          maxLength={useBackupCode ? undefined : 6}
          autoComplete="one-time-code"
          autoFocus
          required
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? t("verifying") : t("submit")}
      </Button>
      <button
        type="button"
        className="text-center text-xs text-muted-foreground underline"
        onClick={() => {
          setUseBackupCode((value) => !value);
          setCode("");
        }}
      >
        {useBackupCode ? t("backToCode") : t("useBackupCode")}
      </button>
    </form>
  );
}
