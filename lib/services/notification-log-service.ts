import { db } from "@/lib/db";
import { runWithPlatformScope } from "@/lib/tenant-context";

type NotificationLogClient = Pick<typeof db, "notificationLog">;

/**
 * Trilha append-only de tentativas de envio de notificação (Resend), gravada
 * pelo worker (fora de qualquer `runWithTenant`) — por isso sempre via
 * platform scope, com `organizationId` explícito vindo do registro que
 * originou o job (booking, invitation, quote request, membership).
 */
export async function recordNotificationLog(
  params: {
    organizationId: string;
    type: string;
    recipient: string;
    status: "ACCEPTED" | "FAILED";
    errorMessage?: string;
  },
  client: NotificationLogClient = db,
): Promise<unknown> {
  const { organizationId, ...data } = params;
  return runWithPlatformScope(() =>
    client.notificationLog.create({ data: { ...data, organizationId } }),
  );
}
