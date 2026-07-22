"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { recordConsent } from "@/app/_actions/record-consent";
import { getRootUrl } from "@/lib/tenant-host";
import { Button } from "@/app/_components/ui/button";

const CONSENT_VERSION = "1";
const STORAGE_KEY = "bladiq-cookie-consent";

function subscribe() {
  // localStorage não dispara storage event na mesma aba que escreveu —
  // não há nada pra assinar de verdade, só lemos uma vez no cliente
  // (mesmo padrão de app/app/last-visited-card.tsx).
  return () => {};
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) !== CONSENT_VERSION;
}

function getServerSnapshot() {
  return false;
}

/**
 * Só cookies essenciais (sessão, tenant, tema) — sem categorias de
 * marketing/analytics pra escolher, então um aviso + aceitar já cobre o
 * requisito legal alemão. Rodapé fixo, não modal (não deve bloquear a
 * navegação enquanto decide).
 */
export function CookieConsentBanner() {
  const t = useTranslations("cookieConsent");
  const shouldShow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const action = useAction(recordConsent);

  if (!shouldShow || dismissed) return null;

  function accept() {
    window.localStorage.setItem(STORAGE_KEY, CONSENT_VERSION);
    setDismissed(true);
    action.execute({ type: "cookies", version: CONSENT_VERSION });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-muted-foreground">
          {t("message")}{" "}
          <a href={getRootUrl("/privacy")} className="underline">
            {t("privacyLink")}
          </a>
        </p>
        <Button size="sm" className="shrink-0 rounded-full" onClick={accept}>
          {t("accept")}
        </Button>
      </div>
    </div>
  );
}
