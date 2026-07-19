"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/_components/ui/button";

/**
 * Cartão de "e-mail divergente" do onboarding: o usuário pagou com um e-mail
 * mas está logado com outro. Sair e recarregar leva a página ao branch do
 * ClaimAccountForm, já com o e-mail do pagamento travado.
 */
export function SignOutAndContinueButton() {
  const t = useTranslations("onboarding");
  const [isPending, setIsPending] = useState(false);

  async function onClick() {
    setIsPending(true);
    await authClient.signOut();
    window.location.reload();
  }

  return (
    <Button onClick={onClick} disabled={isPending}>
      {isPending ? t("signingOut") : t("signOutAndContinue")}
    </Button>
  );
}
