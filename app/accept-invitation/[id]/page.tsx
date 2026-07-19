import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getInvitationById } from "@/lib/services/member-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { AcceptInvitationAuthForm } from "./accept-invitation-auth-form";
import { AcceptInvitationConfirm } from "./accept-invitation-confirm";

function InvitationError({ title, body, backHome }: { title: string; body: string; backHome: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{body}</p>
          <Button asChild>
            <Link href="/">{backHome}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invitation = await getInvitationById(id);
  const t = await getTranslations("invitation");

  if (!invitation) {
    return (
      <InvitationError
        title={t("notFoundTitle")}
        body={t("notFoundBody")}
        backHome={t("backHome")}
      />
    );
  }
  if (invitation.status !== "pending") {
    return (
      <InvitationError
        title={t("unavailableTitle")}
        body={t("unavailableBody")}
        backHome={t("backHome")}
      />
    );
  }
  if (invitation.expiresAt < new Date()) {
    return (
      <InvitationError
        title={t("expiredTitle")}
        body={t("expiredBody")}
        backHome={t("backHome")}
      />
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <AcceptInvitationAuthForm email={invitation.email} organizationName={invitation.organization.name} />
      </main>
    );
  }

  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <InvitationError
        title={t("wrongAccountTitle")}
        body={t("wrongAccountBody", { email: invitation.email })}
        backHome={t("backHome")}
      />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <AcceptInvitationConfirm
        invitationId={invitation.id}
        organizationName={invitation.organization.name}
        role={invitation.role}
      />
    </main>
  );
}
