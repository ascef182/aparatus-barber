"use server";

import { APIError } from "better-auth";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ActionError, staffWriteActionClient } from "@/lib/safe-action";
import { enqueueInvitationEmail } from "@/lib/notifications";
import { logAuditEvent } from "@/lib/services/audit-service";
import { getRootDomain } from "@/lib/tenant-host";

/**
 * Convite de equipe via e-mail. "owner" nunca é um role convidável — só
 * existe via creatorRole na criação da organização (app/_actions/create-organization.ts).
 */
export const inviteMember = staffWriteActionClient({ staff: ["manage"] })
  .inputSchema(z.object({
    email: z.string().email(),
    role: z.enum(["manager", "professional", "receptionist"]),
  }))
  .action(async ({ parsedInput, ctx }) => {
    let invitation;
    try {
      invitation = await auth.api.createInvitation({
        body: { email: parsedInput.email, role: parsedInput.role, organizationId: ctx.organization.id },
        headers: await headers(),
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw new ActionError(error.message || "Não foi possível criar o convite.");
      }
      throw error;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const inviteUrl = appUrl
      ? `${appUrl}/accept-invitation/${invitation.id}`
      : `https://${getRootDomain()}/accept-invitation/${invitation.id}`;

    await enqueueInvitationEmail({
      invitationId: invitation.id,
      email: invitation.email,
      organizationName: ctx.organization.name,
      inviteUrl,
    });
    await logAuditEvent({
      entity: "Invitation",
      action: "INVITE_SENT",
      entityId: invitation.id,
      actorId: ctx.user.id,
      organizationId: ctx.organization.id,
    });

    return { id: invitation.id };
  });
