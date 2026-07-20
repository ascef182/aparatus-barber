import { db } from "@/lib/db";
import { requireTenantId, runWithPlatformScope } from "@/lib/tenant-context";

export function getCustomerById(id: string) {
  return db.customer.findUnique({ where: { id } });
}

export function listCustomers(search?: string) {
  return db.customer.findMany({
    where: search?.trim()
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });
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
      where: { email: { equals: data.email, mode: "insensitive" }, userId: null },
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
export async function eraseCustomersForUser(userId: string): Promise<{ organizationIds: string[] }> {
  return runWithPlatformScope(async () => {
    const customers = await db.customer.findMany({ where: { userId }, select: { id: true, organizationId: true } });
    if (!customers.length) return { organizationIds: [] };
    await db.customer.updateMany({
      where: { id: { in: customers.map((c) => c.id) } },
      data: { name: "ANONYMIZED", email: null, phone: null, notes: null, gdprErasedAt: new Date() },
    });
    return { organizationIds: [...new Set(customers.map((c) => c.organizationId))] };
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
            id: true, startAt: true, endAt: true, status: true, priceInCents: true, currency: true,
            paymentStatus: true, cancellationFeeInCents: true, createdAt: true,
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
}) {
  const existing = await db.customer.findUnique({
    where: {
      organizationId_userId: {
        organizationId: requireTenantId(),
        userId: user.id,
      },
    },
  });
  if (existing) return existing;
  return db.customer.create({
    data: {
      organizationId: requireTenantId(),
      userId: user.id,
      name: user.name,
      email: user.email,
    },
  });
}
