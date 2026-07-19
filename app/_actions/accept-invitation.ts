"use server";

import { APIError } from "better-auth";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ActionError, authActionClient } from "@/lib/safe-action";
import { getInvitationById } from "@/lib/services/member-service";
import { logAuditEvent } from "@/lib/services/audit-service";
import { getMembership } from "@/lib/services/member-service";
import { runWithTenant } from "@/lib/tenant-context";
import { db } from "@/lib/db";

/**
 * Roda na página raiz /accept-invitation/[id] (fora de qualquer subdomínio
 * de tenant), por isso authActionClient (não tenantActionClient) — a
 * organização vem do próprio convite, não do host.
 */
export const acceptInvitation = authActionClient
  .inputSchema(z.object({ invitationId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const invitation = await getInvitationById(parsedInput.invitationId);
    if (!invitation) {
      throw new ActionError("Convite não encontrado.");
    }

    try {
      await auth.api.acceptInvitation({
        body: { invitationId: parsedInput.invitationId },
        headers: await headers(),
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw new ActionError(error.message || "Não foi possível aceitar o convite.");
      }
      throw error;
    }

    const membership = await getMembership(invitation.organizationId, ctx.user.id);
    if (membership) {
      await runWithTenant(invitation.organizationId, () => db.staff.updateMany({
        where: { invitationId: invitation.id }, data: { memberId: membership.id },
      }));
    }

    await logAuditEvent({
      entity: "Invitation",
      action: "INVITE_ACCEPTED",
      entityId: invitation.id,
      actorId: ctx.user.id,
      organizationId: invitation.organizationId,
    });

    return { organizationSlug: invitation.organization.slug };
  });
