import { db } from "@/lib/db";
import { runWithPlatformScope } from "@/lib/tenant-context";

type AuditLogClient = Pick<typeof db, "auditLog">;

export type AuditAction =
  | "DPA_ACCEPTED"
  | "CUSTOMER_ERASED"
  | "DATA_EXPORTED"
  | "INVITE_SENT"
  | "INVITE_ACCEPTED"
  | "MEMBER_REMOVED"
  | "MEMBER_ROLE_UPDATED"
  | "MFA_ENABLED"
  | "MFA_DISABLED"
  | "SUBSCRIPTION_CHANGED"
  | "BOOKING_CREATED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_CAPTURED"
  | "PAYMENT_REFUNDED"
  | "BOOKING_COMPLETED"
  | "BOOKING_NO_SHOW"
  | "PAYMENT_RECORDED_ON_SITE"
  | "IMPRESSUM_UPDATED"
  | "ONBOARDING_FAILED";

/**
 * Trilha de auditoria — append-only, sem update/delete pela aplicação.
 *
 * Dois modos de uso:
 * - `organizationId` omitido: exige contexto de tenant já ativo
 *   (`runWithTenant`) — a extension de `lib/db.ts` injeta o organizationId.
 *   É o caso comum: a action já está dentro da cadeia tenantActionClient.
 * - `organizationId` explícito: sempre via platform scope, independente do
 *   contexto ambiente — usado por webhooks/jobs que rodam fora de
 *   `runWithTenant` (ex.: confirmação de pagamento, refund), onde a
 *   organização só é conhecida via o registro que disparou o evento.
 */
export async function logAuditEvent(
  params: {
    entity: string;
    action: AuditAction;
    entityId?: string;
    actorId?: string;
    organizationId?: string;
    metadata?: Record<string, unknown>;
  },
  client: AuditLogClient = db,
): Promise<unknown> {
  const data = {
    entity: params.entity,
    action: params.action,
    entityId: params.entityId,
    actorId: params.actorId,
    metadata: params.metadata ?? {},
  };
  if (params.organizationId) {
    const organizationId = params.organizationId;
    return runWithPlatformScope(() => client.auditLog.create({ data: { ...data, organizationId } }));
  }
  return client.auditLog.create({ data });
}
