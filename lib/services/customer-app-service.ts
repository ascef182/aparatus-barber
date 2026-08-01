import { db } from "@/lib/db";
import { runWithPlatformScope } from "@/lib/tenant-context";

/**
 * Leituras cross-tenant do app de descoberta (app.{root}) — mesmo padrão de
 * lib/services/directory-service.ts (runWithPlatformScope, sempre filtrado
 * por userId da sessão, nunca por input do cliente). Só leitura: ações
 * (cancelar reserva, editar Customer por tenant) continuam vivendo dentro
 * de runWithTenant em app/t/[slug]/account, nunca aqui.
 */

export function listBookingsForUser(userId: string) {
  return runWithPlatformScope(() =>
    db.booking.findMany({
      where: { customer: { userId } },
      select: {
        id: true,
        startAt: true,
        status: true,
        priceInCents: true,
        currency: true,
        service: { select: { name: true } },
        staff: { select: { displayName: true } },
        organization: { select: { name: true, slug: true, category: true } },
      },
      orderBy: { startAt: "desc" },
    }),
  );
}

export function listCouponsForUser(userId: string) {
  return runWithPlatformScope(() =>
    db.customerCoupon.findMany({
      where: { customer: { userId } },
      select: {
        id: true,
        claimedAt: true,
        coupon: { select: { code: true, type: true, value: true, validUntil: true, isActive: true } },
        organization: { select: { name: true, slug: true, currency: true } },
      },
      orderBy: { claimedAt: "desc" },
    }),
  );
}

/**
 * "Meus negócios" da Conta — inclui hasUnreadMessages (Conversation é 1:1
 * por Customer via @@unique([organizationId, customerId]), mesmo o campo
 * sendo array no schema) pra sinalizar sem precisar de uma inbox agregada.
 */
export async function listOrganizationsWithCustomerForUser(userId: string) {
  const customers = await runWithPlatformScope(() =>
    db.customer.findMany({
      where: { userId },
      select: {
        organizationId: true,
        organization: { select: { name: true, slug: true, logo: true, category: true } },
        conversations: { select: { lastMessageAt: true, lastCustomerReadAt: true } },
      },
      distinct: ["organizationId"],
      orderBy: { organizationId: "asc" },
    }),
  );

  return customers.map(({ organizationId, organization, conversations }) => {
    const conversation = conversations[0];
    const hasUnreadMessages = Boolean(
      conversation?.lastMessageAt &&
        (!conversation.lastCustomerReadAt || conversation.lastMessageAt > conversation.lastCustomerReadAt),
    );
    return { organizationId, organization, hasUnreadMessages };
  });
}
