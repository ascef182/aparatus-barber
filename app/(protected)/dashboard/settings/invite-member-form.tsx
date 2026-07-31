"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { inviteMember } from "@/app/_actions/invite-member";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";

const ROLE_OPTIONS = ["manager", "professional", "receptionist"] as const;

export function InviteMemberForm() {
  const t = useTranslations("dashboard.settings");
  const tRoles = useTranslations("roles");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "professional" | "receptionist">("professional");

  const action = useAction(inviteMember, {
    onSuccess: () => {
      toast.success(t("invited"));
      setEmail("");
    },
    onError: ({ error }) => toast.error(error.serverError ?? t("inviteError")),
  });

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        action.execute({ email, role });
      }}
    >
      <div className="grid min-w-[200px] flex-1 gap-1.5">
        <Label htmlFor="invite-member-email">{t("inviteEmailLabel")}</Label>
        <Input id="invite-member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="invite-member-role">{t("inviteRoleLabel")}</Label>
        <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
          <SelectTrigger id="invite-member-role" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>{tRoles(option)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={action.isPending}>
        {action.isPending ? t("inviting") : t("inviteSubmit")}
      </Button>
    </form>
  );
}
