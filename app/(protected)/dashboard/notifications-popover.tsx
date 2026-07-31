"use client";

import { Bell } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/_components/ui/popover";

export function NotificationsPopover({ label, emptyLabel }: { label: string; emptyLabel: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <Bell className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="text-sm text-muted-foreground">
        {emptyLabel}
      </PopoverContent>
    </Popover>
  );
}
