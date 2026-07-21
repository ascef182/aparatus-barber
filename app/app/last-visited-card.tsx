"use client";

import { useSyncExternalStore } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getLastShop } from "@/lib/customer-app-storage";
import { getTenantUrl } from "@/lib/tenant-host";

function subscribe() {
  // localStorage não dispara storage event na mesma aba que escreveu —
  // não há nada pra assinar de verdade, só lemos uma vez no cliente.
  return () => {};
}

function getServerSnapshot() {
  return null;
}

/**
 * Atalho opcional pro último negócio escolhido — um card, não um
 * redirecionamento automático. Já tentamos redirect automático aqui e
 * prendia quem volta pra /app querendo buscar outro negócio num loop de
 * volta pro mesmo subdomínio (localStorage não tem como saber que dessa
 * vez o cliente queria a home, não o atalho). useSyncExternalStore em vez
 * de useState+useEffect: getServerSnapshot casa com o que o servidor
 * renderizou (sempre null), sem mismatch de hidratação.
 */
export function LastVisitedCard() {
  const t = useTranslations("app");
  const lastShop = useSyncExternalStore(subscribe, getLastShop, getServerSnapshot);

  if (!lastShop) return null;

  return (
    <a
      href={getTenantUrl(lastShop.slug)}
      className="flex items-center justify-between gap-3 rounded-xl border bg-accent/50 px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
    >
      {t("continueWith", { name: lastShop.name })}
      <ChevronRight className="size-4 shrink-0" />
    </a>
  );
}
