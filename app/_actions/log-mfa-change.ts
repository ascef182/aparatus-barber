"use server";

import { z } from "zod";
import { tenantActionClient } from "@/lib/safe-action";
import { logAuditEvent } from "@/lib/services/audit-service";

/**
 * authClient.twoFactor.enable/verifyTotp/disable (security-section.tsx) já
 * fazem a mudança real client-side via Better Auth — esta action só
 * registra a auditoria depois que o cliente confirma sucesso.
 */
export const logMfaChange = tenantActionClient
  .inputSchema(z.object({ enabled: z.boolean() }))
  .action(async ({ parsedInput, ctx }) => {
    await logAuditEvent({
      entity: "Member",
      action: parsedInput.enabled ? "MFA_ENABLED" : "MFA_DISABLED",
      actorId: ctx.user.id,
      organizationId: ctx.organization.id,
    });
    return { ok: true };
  });
