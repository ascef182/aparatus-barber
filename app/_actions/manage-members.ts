"use server";

import { APIError } from "better-auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ActionError, staffWriteActionClient } from "@/lib/safe-action";
import { logAuditEvent } from "@/lib/services/audit-service";
import { removeMemberSchema, updateMemberRoleSchema } from "./manage-members.schemas";

/**
 * Remove/troca de cargo de um membro já aceito (Member) — "owner" nunca é um
 * alvo válido aqui (UI não renderiza esses controles para a linha do owner,
 * e o próprio better-auth impede a remoção do owner via sua RBAC interna).
 */
export const removeMember = staffWriteActionClient({ staff: ["manage"] })
  .inputSchema(removeMemberSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      await auth.api.removeMember({
        body: { memberIdOrEmail: parsedInput.memberId, organizationId: ctx.organization.id },
        headers: await headers(),
      });
    } catch (error) {
      if (error instanceof APIError) throw new ActionError(error.message || "Não foi possível remover o membro.");
      throw error;
    }
    await logAuditEvent({
      entity: "Member",
      action: "MEMBER_REMOVED",
      entityId: parsedInput.memberId,
      actorId: ctx.user.id,
      organizationId: ctx.organization.id,
    });
    revalidatePath("/dashboard/settings");
    return { ok: true };
  });

export const updateMemberRole = staffWriteActionClient({ staff: ["manage"] })
  .inputSchema(updateMemberRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      await auth.api.updateMemberRole({
        body: { memberId: parsedInput.memberId, role: parsedInput.role, organizationId: ctx.organization.id },
        headers: await headers(),
      });
    } catch (error) {
      if (error instanceof APIError) throw new ActionError(error.message || "Não foi possível alterar o papel.");
      throw error;
    }
    await logAuditEvent({
      entity: "Member",
      action: "MEMBER_ROLE_UPDATED",
      entityId: parsedInput.memberId,
      actorId: ctx.user.id,
      organizationId: ctx.organization.id,
      metadata: { role: parsedInput.role },
    });
    revalidatePath("/dashboard/settings");
    return { ok: true };
  });
