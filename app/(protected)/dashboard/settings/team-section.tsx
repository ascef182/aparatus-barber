import { getTranslations } from "next-intl/server";
import { InviteMemberForm } from "./invite-member-form";
import { TeamMemberRow } from "./team-member-row";

const KNOWN_ROLES = new Set(["owner", "manager", "professional", "receptionist"]);

export async function TeamSection({
  members,
  pendingInvitations,
}: {
  members: { id: string; role: string; userName: string; userEmail: string }[];
  pendingInvitations: { id: string; email: string; role: string | null }[];
}) {
  const t = await getTranslations("dashboard.settings");
  const tRoles = await getTranslations("roles");
  const roleLabel = (role: string) => (KNOWN_ROLES.has(role) ? tRoles(role) : role);
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{t("teamTitle")}</h2>
      <div className="mb-4 rounded-lg border bg-background p-4">
        <InviteMemberForm />
      </div>
      <div className="grid gap-2">
        {members.map((member) => (
          <TeamMemberRow key={member.id} member={member} />
        ))}
      </div>
      {pendingInvitations.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-muted-foreground">{t("pendingInvitations")}</p>
          <div className="grid gap-2">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between rounded-md border border-dashed p-3 text-sm">
                <span>{invitation.email}</span>
                <span className="text-xs text-muted-foreground">
                  {invitation.role ? roleLabel(invitation.role) : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
