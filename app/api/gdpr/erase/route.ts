import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { eraseCustomersForUser } from "@/lib/services/customer-service";
import { countMembershipsForUser, deleteUserAccount } from "@/lib/services/member-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/services/audit-service";

/**
 * Direito ao esquecimento (GDPR Art. 17). Anonimiza Customer em todos os
 * tenants do usuário; Booking/pagamento são preservados (retenção fiscal).
 * Deleta o User global só se não houver mais Member ativo em nenhum tenant
 * (dono de barbearia não pode se autoerasar e deletar o próprio negócio).
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(`gdpr-erase:${session.user.id}`, { windowSeconds: 86400, max: 3 });
  if (!allowed) return NextResponse.json({ error: "Muitas solicitações. Tente novamente em 24h." }, { status: 429 });

  const { organizationIds } = await eraseCustomersForUser(session.user.id);
  for (const organizationId of organizationIds) {
    await logAuditEvent({ actorId: session.user.id, entity: "Customer", action: "CUSTOMER_ERASED", organizationId });
  }

  const activeMemberships = await countMembershipsForUser(session.user.id);
  if (activeMemberships === 0) {
    await deleteUserAccount(session.user.id);
  }

  logger({ userId: session.user.id }).info({ organizationIds }, "gdpr.erased");
  return NextResponse.json({ erased: true, organizationsAffected: organizationIds.length });
}
