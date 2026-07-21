"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/app/_components/ui/button";

/**
 * router.back() em vez de link fixo pro diretório — a página de tenant é
 * acessada tanto de /app (home do cliente final) quanto de /find/[city]
 * (diretório de marketing); um destino fixo (ex.: sempre /find) manda o
 * cliente pro lugar errado quando ele veio do /app, quebrando a sensação
 * de app nativo. Histórico do navegador sempre sabe de onde veio.
 */
export function BackButton() {
  const router = useRouter();

  return (
    <Button size="icon" variant="secondary" className="absolute top-4 left-4 z-10 rounded-full" onClick={() => router.back()}>
      <ChevronLeft className="size-5" />
    </Button>
  );
}
