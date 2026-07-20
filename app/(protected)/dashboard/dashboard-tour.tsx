"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";

const DISMISSED_KEY = "aparatus:tour-dismissed";
const STEP_KEYS = ["agenda", "services", "staff", "customers", "settings"] as const;

function subscribeNoop() {
  return () => {};
}
function getDismissedSnapshot() {
  return localStorage.getItem(DISMISSED_KEY);
}
// SSR/hidratação inicial: assume "já visto" pra não piscar o modal antes do
// client checar o localStorage de verdade (useSyncExternalStore corrige o
// snapshot logo após montar, sem precisar de setState manual num effect).
function getServerSnapshot() {
  return "1";
}

/**
 * Tour de primeira visita — só aparece uma vez (flag em localStorage, sem
 * campo novo no schema). Não bloqueia nada: fechar/pular não afeta o
 * paywall nem qualquer outra trava.
 */
export function DashboardTour() {
  const t = useTranslations("dashboard.tour");
  const dismissedFlag = useSyncExternalStore(subscribeNoop, getDismissedSnapshot, getServerSnapshot);
  const [step, setStep] = useState(0);
  const [closed, setClosed] = useState(false);

  if (dismissedFlag !== null || closed) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setClosed(true);
  }

  const key = STEP_KEYS[step]!;
  const isLast = step === STEP_KEYS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t(`${key}.title`)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t(`${key}.body`)}</p>
          <div className="flex items-center justify-between">
            <button type="button" className="text-xs text-muted-foreground underline" onClick={dismiss}>
              {t("skip")}
            </button>
            <Button onClick={() => (isLast ? dismiss() : setStep(step + 1))}>
              {isLast ? t("gotIt") : t("next")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
