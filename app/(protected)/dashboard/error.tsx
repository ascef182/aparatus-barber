"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/app/_components/ui/empty-state";
import { Button } from "@/app/_components/ui/button";

/**
 * Sem este boundary, qualquer exceção não tratada durante o render de
 * app/(protected)/dashboard/** (ex.: falha de conexão com Postgres/Redis
 * durante auth.api.getSession) derrubava a árvore inteira do dashboard pra
 * tela de erro genérica do Next, sem opção de retry — o `digest` já chega
 * ao Sentry via instrumentation.ts (onRequestError), então só reportamos
 * aqui pra cobrir também exceções de render que só acontecem no cliente
 * (após a hidratação), que onRequestError não vê.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("dashboard.error");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="p-6">
      <EmptyState
        icon={TriangleAlert}
        title={t("title")}
        description={t("description")}
        action={<Button onClick={() => reset()}>{t("retry")}</Button>}
      />
    </div>
  );
}
