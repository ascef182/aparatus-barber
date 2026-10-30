"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/app/_components/ui/sheet";

/** Nav mobile do site de marketing — versão leve do mobile-nav.tsx do
 * dashboard: aqui são só âncoras da própria landing, não rotas de app. */
export function MobileNav({
  links,
  signInHref,
  signInLabel,
  startFreeHref,
  startFreeLabel,
}: {
  links: { href: string; label: string }[];
  signInHref: string;
  signInLabel: string;
  startFreeHref: string;
  startFreeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Menu"
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 transition-colors md:hidden"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="border-border bg-background text-foreground flex w-72 flex-col gap-0 p-0"
      >
        <SheetTitle className="border-border text-foreground border-b px-4 py-4 text-left font-semibold tracking-tight">
          Bladiq
        </SheetTitle>
        <div className="flex flex-1 flex-col gap-1 px-4 py-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-2 py-2.5 text-sm transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="border-border flex flex-col gap-2 border-t p-4">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-border text-foreground hover:bg-muted bg-transparent"
          >
            <Link href={signInHref} onClick={() => setOpen(false)}>
              {signInLabel}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={startFreeHref} onClick={() => setOpen(false)}>
              {startFreeLabel}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
