"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

const STORAGE_KEY = "aparatus-sidebar-collapsed";

// Lido em useEffect (não no useState inicial) pra renderizar expandido no
// primeiro paint igual ao servidor — evita mismatch de hidratação. Custa um
// flash breve pra quem já colapsou antes, aceitável (mesmo trade-off que
// next-themes faria sem o script bloqueante que ele injeta só pro tema).
export function CollapsibleSidebar({
  organizationName,
  navItems,
  userMenuProps,
}: {
  organizationName: string;
  navItems: NavItem[];
  userMenuProps: ComponentProps<typeof UserMenu>;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-4">
        {!collapsed && (
          <Link href="/dashboard" className="truncate font-semibold tracking-tight">
            {organizationName}
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            collapsed && "mx-auto",
          )}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav items={navItems} collapsed={collapsed} />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <UserMenu {...userMenuProps} collapsed={collapsed} />
      </div>
    </aside>
  );
}
