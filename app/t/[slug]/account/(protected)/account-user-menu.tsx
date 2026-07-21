"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getTenantUrl } from "@/lib/tenant-host";
import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";

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

/** Versão enxuta de app/(protected)/dashboard/user-menu.tsx pra área do
 * cliente final — o sign-out volta pro sign-in do PRÓPRIO tenant
 * ({slug}.{root}/account/sign-in), não pro /sign-in de staff no domínio raiz. */
export function AccountUserMenu({
  name,
  email,
  slug,
  signOutLabel,
  signingOutLabel,
  signOutErrorFallback,
}: {
  name: string;
  email: string;
  slug: string;
  signOutLabel: string;
  signingOutLabel: string;
  signOutErrorFallback: string;
}) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const result = await authClient.signOut();
    if (result.error) {
      toast.error(result.error.message ?? signOutErrorFallback);
      setPending(false);
      return;
    }
    window.location.assign(getTenantUrl(slug, "/account/sign-in"));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{name}</span>
            <span className="block truncate text-xs text-sidebar-foreground/60">{email}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
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
