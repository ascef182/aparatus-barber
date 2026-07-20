"use client";

import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { acceptInvitation } from "@/app/_actions/accept-invitation";
import { getTenantUrl } from "@/lib/tenant-host";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";

const KNOWN_ROLES = new Set(["manager", "professional", "receptionist"]);

export function AcceptInvitationConfirm({
  invitationId,
  organizationName,
  role,
}: {
  invitationId: string;
  organizationName: string;
  role: string | null;
}) {
  const t = useTranslations("invitation");
  const tRoles = useTranslations("roles");
  const roleLabel = role && KNOWN_ROLES.has(role) ? tRoles(role) : tRoles("member");

  const action = useAction(acceptInvitation, {
    onSuccess: ({ data }) => {
      if (!data) return;
      window.location.href = getTenantUrl(data.organizationSlug, "/dashboard");
    },
    onError: ({ error }) => toast.error(error.serverError ?? t("acceptError")),
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("inviteFor", { organizationName })}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("invitedAs", { role: roleLabel })}</p>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          disabled={action.isPending}
          onClick={() => action.execute({ invitationId })}
        >
          {action.isPending ? t("accepting") : t("acceptInvite")}
        </Button>
      </CardContent>
    </Card>
  );
}
