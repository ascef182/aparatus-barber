"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { inviteMember } from "@/app/_actions/invite-member";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";

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
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        action.execute({ email, role });
      }}
    >
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs text-muted-foreground">{t("inviteEmailLabel")}</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">{t("inviteRoleLabel")}</label>
        <select
          className="block rounded-md border p-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>{tRoles(option)}</option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={action.isPending}>
        {action.isPending ? t("inviting") : t("inviteSubmit")}
      </Button>
    </form>
  );
}
