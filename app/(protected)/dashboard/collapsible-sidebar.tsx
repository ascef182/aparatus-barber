"use client";

import Link from "next/link";
import { useSyncExternalStore, type ComponentProps } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

const STORAGE_KEY = "aparatus-sidebar-collapsed";

// useSyncExternalStore (não useEffect+setState) pra ler localStorage com
// segurança de hidratação: getServerSnapshot sempre devolve expandido
// (igual ao servidor), getSnapshot lê o valor real assim que monta no
// cliente — mesmo trade-off de flash breve de antes, só que pela via que o
// próprio React recomenda pra sincronizar com um external store.
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}
function getServerSnapshot() {
  return false;
}
function setCollapsedStorage(value: boolean) {
  localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  listeners.forEach((listener) => listener());
}

export function CollapsibleSidebar({
  organizationName,
  navItems,
  userMenuProps,
}: {
  organizationName: string;
  navItems: NavItem[];
  userMenuProps: ComponentProps<typeof UserMenu>;
}) {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    setCollapsedStorage(!collapsed);
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
