"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { startPlanCheckout } from "@/app/_actions/start-plan-checkout";
import { Button } from "@/app/_components/ui/button";

export function PricingCtaButton({
  plan,
  label,
}: {
  plan: "STARTER" | "GROWTH" | "PRO";
  label: string;
}) {
  const { execute, isPending } = useAction(startPlanCheckout, {
    onSuccess: ({ data }) => {
      if (data?.url) window.location.assign(data.url);
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Não foi possível iniciar o checkout.");
    },
  });

  return (
    <Button className="w-full" disabled={isPending} onClick={() => execute({ plan })}>
      {isPending ? "..." : label}
    </Button>
  );
}
