import Link from "next/link";
import { Button } from "@/app/_components/ui/button";
import { getRootUrl } from "@/lib/tenant-host";

/**
 * Leva direto para o cadastro grátis (sem Stripe Checkout aqui) — o plano
 * escolhido vai junto na query string e é lembrado até a hora de assinar de
 * verdade, depois do período de teste (ver app/_actions/create-organization.ts
 * e app/(protected)/dashboard/billing/billing-controls.tsx).
 */
export function PricingCtaButton({
  plan,
  label,
}: {
  plan: "STARTER" | "GROWTH" | "PRO";
  label: string;
}) {
  return (
    <Button asChild className="w-full">
      <Link href={getRootUrl(`/sign-up?plan=${plan.toLowerCase()}`)}>{label}</Link>
    </Button>
  );
}
