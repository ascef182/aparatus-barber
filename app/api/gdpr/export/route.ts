import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportCustomerDataForUser } from "@/lib/services/customer-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/services/audit-service";
import { tooManyRequests, unauthorized } from "@/lib/http-errors";

/**
 * Portabilidade de dados (GDPR Art. 20). Dataset pequeno o suficiente
 * (perfil + histórico de reservas por usuário) para servir síncrono —
 * sem card data (nunca passou pelo nosso backend, é tudo Stripe-hosted).
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return unauthorized("Unauthorized");

  const { allowed } = await checkRateLimit(`gdpr-export:${session.user.id}`, { windowSeconds: 86400, max: 3 });
  if (!allowed) return tooManyRequests("Muitas solicitações. Tente novamente em 24h.");

  const customers = await exportCustomerDataForUser(session.user.id);
  for (const customer of customers) {
    await logAuditEvent({ actorId: session.user.id, entity: "Customer", action: "DATA_EXPORTED", organizationId: customer.organizationId });
  }

  logger({ userId: session.user.id }).info({ organizationCount: customers.length }, "gdpr.exported");
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    profile: { name: session.user.name, email: session.user.email },
    customers: customers.map((c) => ({
      organizationId: c.organizationId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      bookings: c.bookings,
    })),
  });
}
