"use client";

import { useState, useSyncExternalStore } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { getRootUrl } from "@/lib/tenant-host";
import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";

function subscribeNoop() {
  return () => {};
}

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function UserMenu({
  name,
  email,
  roleLabel,
  signOutLabel,
  signingOutLabel,
  themeLabel,
  signOutErrorFallback,
  collapsed,
}: {
  name: string;
  email: string;
  roleLabel: string;
  signOutLabel: string;
  signingOutLabel: string;
  themeLabel: string;
  signOutErrorFallback: string;
  collapsed?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const dark = theme === "dark";
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const result = await authClient.signOut();
    if (result.error) {
      toast.error(result.error.message ?? signOutErrorFallback);
      setPending(false);
      return;
    }
    window.location.assign(getRootUrl("/sign-in"));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50",
            collapsed && "justify-center px-0",
          )}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{name}</span>
              <span className="block truncate text-xs text-sidebar-foreground/60">{roleLabel}</span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!mounted}
          onSelect={(event) => {
            event.preventDefault();
            setTheme(dark ? "light" : "dark");
          }}
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {themeLabel}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut className="size-4" />
          {pending ? signingOutLabel : signOutLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
