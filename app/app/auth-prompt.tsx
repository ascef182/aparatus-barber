import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/app/_components/ui/button";

/** Estado "convite pra agir" reaproveitado por /bookings e /account quando
 * não há sessão — antes eram dois blocos de texto solto duplicados. */
export function AuthPrompt({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref = "/account/sign-in",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
}) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-lg font-bold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild size="lg" className="rounded-full px-8">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </main>
  );
}
