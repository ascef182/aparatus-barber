import { db, runInTenantTransaction } from "@/lib/db";
import { requireTenantId, runWithPlatformScope } from "@/lib/tenant-context";

export function getCustomerById(id: string) {
  return db.customer.findUnique({ where: { id } });
}

export type CustomerStatusFilter = "all" | "active" | "blocked";

export function listCustomers(
  search?: string,
  statusFilter: CustomerStatusFilter = "all",
) {
  return db.customer.findMany({
    where: {
      ...(search?.trim()
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
      ...(statusFilter === "active" ? { isBlocked: false } : {}),
      ...(statusFilter === "blocked" ? { isBlocked: true } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export type CustomerStats = {
  totalSpentInCents: number;
  lastVisitAt: Date | null;
  nextAppointmentAt: Date | null;
};

/**
 * Total gasto, última visita e próximo horário por cliente — três `groupBy`
 * em vez de N+1 (uma query de agregação por cliente). Total gasto é sobre
 * TODAS as reservas (não só concluídas): pagamento recebido menos
 * reembolsado já reflete o que o cliente pagou de fato, independente do
 * status atual da reserva.
 */
export async function getCustomerStats(
  customerIds: string[],
): Promise<Map<string, CustomerStats>> {
  const stats = new Map<string, CustomerStats>();
  for (const id of customerIds)
    stats.set(id, {
      totalSpentInCents: 0,
      lastVisitAt: null,
      nextAppointmentAt: null,
    });
  if (!customerIds.length) return stats;

  const now = new Date();
  const [spend, lastVisit, nextAppointment] = await Promise.all([
    db.booking.groupBy({
      by: ["customerId"],
      where: { customerId: { in: customerIds } },
      _sum: { paymentReceivedInCents: true, refundedAmountInCents: true },
    }),
    db.booking.groupBy({
      by: ["customerId"],
      where: { customerId: { in: customerIds }, status: "COMPLETED" },
      _max: { endAt: true },
    }),
    db.booking.groupBy({
      by: ["customerId"],
      where: {
        customerId: { in: customerIds },
        status: "CONFIRMED",
        startAt: { gt: now },
      },
      _min: { startAt: true },
    }),
  ]);
  for (const row of spend) {
    stats.get(row.customerId)!.totalSpentInCents = Math.max(
      0,
      (row._sum.paymentReceivedInCents ?? 0) -
        (row._sum.refundedAmountInCents ?? 0),
    );
  }
  for (const row of lastVisit)
    stats.get(row.customerId)!.lastVisitAt = row._max.endAt;
  for (const row of nextAppointment)
    stats.get(row.customerId)!.nextAppointmentAt = row._min.startAt;
  return stats;
}

/**
 * Guest booking (sem conta): reusa o Customer pelo email quando houver,
 * senão cria um novo — o perfil é POR TENANT (white-label).
 *
 * Match por e-mail NÃO é prova de identidade — este caminho é público e
 * não autenticado (wizard de agendamento). Por isso nunca sobrescreve
 * nome/telefone já preenchidos de um cliente existente; só completa
 * campos vazios. Sem essa guarda, qualquer pessoa que soubesse o e-mail
 * de um cliente já cadastrado no tenant poderia reescrever seu nome e
 * telefone reais só criando uma nova reserva com esse e-mail.
 */
export async function findOrCreateGuestCustomer(data: {
  name: string;
  email?: string;
  phone?: string;
  locale?: string;
}) {
  if (data.email) {
    const existing = await db.customer.findFirst({
      where: {
        email: { equals: data.email, mode: "insensitive" },
        userId: null,
      },
    });
    if (existing) {
      const backfill: { name?: string; phone?: string } = {};
      if (!existing.phone && data.phone) backfill.phone = data.phone;
      if (!Object.keys(backfill).length) return existing;
      return db.customer.update({ where: { id: existing.id }, data: backfill });
    }
  }
  return db.customer.create({
    data: { ...data, organizationId: requireTenantId() },
  });
}

/**
 * Direito ao esquecimento (GDPR): anonimiza os registros Customer do
 * usuário em TODOS os tenants onde reservou — cross-tenant por natureza
 * (a solicitação é do usuário, não de um tenant específico), daí o
 * platform scope. Booking/pagamento NÃO são tocados (retenção fiscal —
 * GoBD §147 AO, 10 anos).
 */
export async function eraseCustomersForUser(
  userId: string,
): Promise<{ organizationIds: string[] }> {
  return runWithPlatformScope(async () => {
    const customers = await db.customer.findMany({
      where: { userId },
      select: { id: true, organizationId: true },
    });
    if (!customers.length) return { organizationIds: [] };
    await db.customer.updateMany({
      where: { id: { in: customers.map((c) => c.id) } },
      data: {
        name: "ANONYMIZED",
        email: null,
        phone: null,
        notes: null,
        gdprErasedAt: new Date(),
      },
    });
    return {
      organizationIds: [...new Set(customers.map((c) => c.organizationId))],
    };
  });
}

/** Exportação de dados (GDPR): perfil + histórico de reservas em todos os tenants. */
export async function exportCustomerDataForUser(userId: string) {
  return runWithPlatformScope(() =>
    db.customer.findMany({
      where: { userId },
      include: {
        bookings: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
            status: true,
            priceInCents: true,
            currency: true,
            paymentStatus: true,
            cancellationFeeInCents: true,
            createdAt: true,
            service: { select: { name: true } },
          },
        },
      },
    }),
  );
}

/** Cliente logado: um Customer por (organização, usuário). */
export async function findOrCreateCustomerForUser(user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}) {
  const organizationId = requireTenantId();
  return runInTenantTransaction(async (tx) => {
    let primary = await tx.customer.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: user.id },
      },
    });

    const guests = user.emailVerified
      ? await tx.customer.findMany({
          where: {
            userId: null,
            email: { equals: user.email, mode: "insensitive" },
            gdprErasedAt: null,
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

    if (!primary && guests.length) {
      primary = await tx.customer.update({
        where: { id: guests[0]!.id },
        data: { userId: user.id, name: user.name, email: user.email },
      });
      guests.shift();
    }
    if (!primary) {
      primary = await tx.customer.create({
        data: {
          organizationId,
          userId: user.id,
          name: user.name,
          email: user.email,
        },
      });
    }

    for (const duplicate of guests) {
      await tx.booking.updateMany({
        where: { customerId: duplicate.id },
        data: { customerId: primary.id },
      });

      const [primaryConversation, duplicateConversation] = await Promise.all([
        tx.conversation.findFirst({ where: { customerId: primary.id } }),
        tx.conversation.findFirst({ where: { customerId: duplicate.id } }),
      ]);
      if (duplicateConversation && primaryConversation) {
        await tx.message.updateMany({
          where: { conversationId: duplicateConversation.id },
          data: { conversationId: primaryConversation.id },
        });
        await tx.conversation.delete({
          where: { id: duplicateConversation.id },
        });
      } else if (duplicateConversation) {
        await tx.conversation.update({
          where: { id: duplicateConversation.id },
          data: { customerId: primary.id },
        });
      }

      const existingClaims = await tx.customerCoupon.findMany({
        where: { customerId: primary.id },
        select: { couponId: true },
      });
      const claimedCouponIds = existingClaims.map((claim) => claim.couponId);
      if (claimedCouponIds.length) {
        await tx.customerCoupon.deleteMany({
          where: {
            customerId: duplicate.id,
            couponId: { in: claimedCouponIds },
          },
        });
      }
      await tx.customerCoupon.updateMany({
        where: { customerId: duplicate.id },
        data: { customerId: primary.id },
      });
      await tx.customer.delete({ where: { id: duplicate.id } });
    }

    return primary;
  });
}

/** Update customer profile (contact info for this organization). */
export async function updateCustomerProfile(
  customerId: string,
  data: { name?: string; email?: string | null; phone?: string | null },
) {
  return db.customer.update({
    where: { id: customerId },
    data,
  });
}
