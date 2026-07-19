"use client";

import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { removeMember, updateMemberRole } from "@/app/_actions/manage-members";
import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog";

const ASSIGNABLE_ROLES = ["manager", "professional", "receptionist"] as const;

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

export function TeamMemberRow({
  member,
}: {
  member: { id: string; role: string; userName: string; userEmail: string };
}) {
  const t = useTranslations("dashboard.settings");
  const tRoles = useTranslations("roles");
  const isOwner = member.role === "owner";

  const roleAction = useAction(updateMemberRole, {
    onSuccess: () => toast.success(t("roleUpdated")),
    onError: ({ error }) => toast.error(error.serverError ?? t("roleUpdateError")),
  });
  const removeAction = useAction(removeMember, {
    onSuccess: () => toast.success(t("memberRemoved")),
    onError: ({ error }) => toast.error(error.serverError ?? t("removeMemberError")),
  });

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback className="bg-muted text-xs font-medium">{initialsOf(member.userName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{member.userName}</p>
          <p className="truncate text-xs text-muted-foreground">{member.userEmail}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isOwner ? (
          <Badge variant="secondary">{tRoles("owner")}</Badge>
        ) : (
          <>
            <Select
              value={member.role}
              disabled={roleAction.isPending}
              onValueChange={(role) => roleAction.execute({ memberId: member.id, role: role as (typeof ASSIGNABLE_ROLES)[number] })}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {tRoles(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t("removeMember")} disabled={removeAction.isPending}>
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("removeMemberConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("removeMemberConfirmBody", { name: member.userName })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("removeMemberCancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => removeAction.execute({ memberId: member.id })}
                  >
                    {t("removeMember")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}
