"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, User } from "lucide-react";

const TABS = [
  { href: "/", labelKey: "home", icon: Home },
  { href: "/bookings", labelKey: "bookings", icon: CalendarDays },
  { href: "/account", labelKey: "account", icon: User },
] as const;

/**
 * Barra de abas fixa do app de descoberta (app.{root}, wrapper TWA) — padrão
 * de app mobile, não o Sheet/hamburger do dashboard (MobileNav), que é
 * desktop-first. "/" é ativo só em match exato pra não acender junto com
 * "/bookings"/"/account".
 */
export function BottomNav({ labels }: { labels: Record<(typeof TABS)[number]["labelKey"], string> }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-around">
        {TABS.map(({ href, labelKey, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              {labels[labelKey]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
