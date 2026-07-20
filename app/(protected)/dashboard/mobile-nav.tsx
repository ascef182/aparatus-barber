"use client";

import { useState, type ComponentProps } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/app/_components/ui/sheet";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

export function MobileNav({
  organizationName,
  navItems,
  userMenuProps,
}: {
  organizationName: string;
  navItems: NavItem[];
  userMenuProps: ComponentProps<typeof UserMenu>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedForPathname, setOpenedForPathname] = useState(pathname);

  // Fecha o menu ao navegar — ajuste de estado durante a renderização
  // (não em useEffect) para evitar um render em cascata extra.
  if (pathname !== openedForPathname) {
    setOpenedForPathname(pathname);
    if (open) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Menu"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-72 flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetTitle className="border-b border-sidebar-border px-4 py-4 text-left font-semibold tracking-tight text-sidebar-foreground">
          {organizationName}
        </SheetTitle>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav items={navItems} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <UserMenu {...userMenuProps} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
