import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAvailableSlots } from "@/lib/scheduling/availability";
import { requireTenantId, runWithPlatformScope } from "@/lib/tenant-context";
import {
  findOrCreateCustomerForUser,
  findOrCreateGuestCustomer,
} from "@/lib/services/customer-service";
import { getResolvedRules } from "@/lib/services/settings-service";
import { validateCoupon } from "@/lib/services/coupon-service";
import { enqueueBookingNotification } from "@/lib/notifications";
import { checkCancellation } from "@/lib/rules/policies/cancellation";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/services/audit-service";
import { assertOwned } from "@/lib/authz";

export type CreateBookingInput = {
  serviceId: string;
  staffId: string;
  startAt: Date;
  source?: "WEB" | "DASHBOARD";
  couponCode?: string;
} & (
  | {
      customer: {
        name: string;
        email?: string;
        phone?: string;
        locale?: string;
      };
      customerUser?: undefined;
    }
  // Cliente logado na área de conta (app/t/[slug]/account) — identidade vem
  // da sessão (ctx.user, resolvido pelo customerActionClient), nunca de
  // input do cliente, o que descarta o risco de spoofing que
  // findOrCreateGuestCustomer precisa guardar contra no wizard sem login.
  | {
      customerUser: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
      };
      customer?: undefined;
    }
);

const SLOT_TAKEN_MESSAGE = "Este horário não está mais disponível.";

/**
 * Invalidação de cache do dashboard é best-effort: fora do lifecycle de uma
 * request Next real (Server Action/Route Handler) — como nos testes de
 * integração, que chamam createBooking()/confirmBookingFromCheckoutSession()
 * diretamente — revalidatePath lança "static generation store missing".
 * Nunca deixamos isso derrubar a criação/confirmação do booking em si.
 */
function revalidateBookingCaches() {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
  } catch {
    // sem request store ativo (ex.: chamada direta em teste/script) — ok, ignora.
  }
}

/** Server-only booking boundary used by the public wizard and dashboard. */
export async function createBooking(input: CreateBookingInput) {
  const organizationId = requireTenantId();
  const [service, staff, rules] = await Promise.all([
    db.service.findUnique({ where: { id: input.serviceId } }),
    db.staff.findUnique({ where: { id: input.staffId } }),
    getResolvedRules(),
  ]);
  if (
    !service?.isActive ||
    !staff?.isActive ||
    (staff.locationId !== service.locationId && service.locationId)
  ) {
    throw new Error("Serviço ou profissional indisponível.");
  }
  const link = await db.staffService.findUnique({
    where: { staffId_serviceId: { staffId: staff.id, serviceId: service.id } },
  });
  if (!link) throw new Error("Profissional não executa este serviço.");

  const slots = await getAvailableSlots({
    serviceId: service.id,
    staffId: staff.id,
    dateISO: input.startAt.toISOString().slice(0, 10),
  });
  if (
    !slots.some((slot) => slot.startAt.getTime() === input.startAt.getTime())
  ) {
    throw new Error(SLOT_TAKEN_MESSAGE);
  }

  const isDashboardBooking = input.source === "DASHBOARD";
  const paymentMode = service.paymentMode ?? rules.paymentMode;
  const requiresOnlinePayment =
    !isDashboardBooking && paymentMode !== "ON_SITE";
  const customer = input.customerUser
    ? await findOrCreateCustomerForUser(input.customerUser)
    : await findOrCreateGuestCustomer(input.customer);
  const totalMinutes =
    service.bufferBeforeMinutes +
    service.durationMinutes +
    service.bufferAfterMinutes;
  const priceInCents = service.priceInCents;

  // couponId/discountInCents validados aqui (não no wizard): o preview do
  // cliente (validate-coupon action) é só UX, a autoridade sobre o desconto
  // aplicado de fato é sempre esta revalidação no momento da criação —
  // mesmo padrão de defesa em profundidade da checagem de slot em
  // getAvailableSlots (preview) + exclusion constraint (autoridade).
  let couponId: string | undefined;
  let discountInCents = 0;
  if (input.couponCode) {
    const result = await validateCoupon(
      input.couponCode,
      service.id,
      priceInCents,
    );
    if (!result.valid) throw new Error(result.reason);
    couponId = result.couponId;
    discountInCents = result.discountInCents;
  }
  const finalPriceInCents = priceInCents - discountInCents;
  const chargeAmount =
    paymentMode === "DEPOSIT"
      ? Math.round((finalPriceInCents * (service.depositPercent ?? 0)) / 100)
      : finalPriceInCents;

  let booking;
  try {
    booking = await db.booking.create({
      data: {
        organizationId,
        locationId: staff.locationId,
        staffId: staff.id,
        serviceId: service.id,
        customerId: customer.id,
        startAt: input.startAt,
        endAt: addMinutes(input.startAt, totalMinutes),
        status: requiresOnlinePayment ? "PENDING_PAYMENT" : "CONFIRMED",
        source: input.source ?? "WEB",
        priceInCents,
        currency: service.currency,
        paymentMode,
        couponId,
        discountInCents,
        paymentStatus: requiresOnlinePayment ? "PENDING" : "NONE",
        paymentReceivedInCents: 0,
        onlinePaymentAmountInCents: requiresOnlinePayment ? chargeAmount : 0,
        expiresAt: requiresOnlinePayment ? addMinutes(new Date(), 30) : null,
        notes:
          chargeAmount === priceInCents
            ? null
            : `online_amount=${chargeAmount}`,
      },
    });
  } catch (error) {
    // A pré-checagem via getAvailableSlots não é atômica com o insert — se
    // duas requisições passarem por ela para o mesmo slot, a constraint GIST
    // do banco (booking_no_overlap) rejeita a segunda. Sem este catch, a
    // mensagem crua do Postgres vazaria pro cliente final.
    if (error instanceof Error && /exclusion constraint/i.test(error.message)) {
      throw new Error(SLOT_TAKEN_MESSAGE);
    }
    throw error;
  }
  if (!requiresOnlinePayment) {
    await enqueueBookingNotification({
      bookingId: booking.id,
      type: "confirmation",
    });
    await enqueueBookingNotification(
      { bookingId: booking.id, type: "reminder" },
      Math.max(0, booking.startAt.getTime() - Date.now() - 24 * 60 * 60 * 1000),
    );
  }
  logger({ organizationId, bookingId: booking.id }).info(
    { status: booking.status },
    "booking.created",
  );
  await logAuditEvent({
    entity: "Booking",
    action: "BOOKING_CREATED",
    entityId: booking.id,
  });
  revalidateBookingCaches();
  return booking;
}

/** Aplica a política de cancelamento (lib/rules/policies/cancellation.ts):
 * rejeita se fora da janela permitida, senão calcula a taxa (se houver) e
 * grava junto com o cancelamento — não é um simples update de status.
 *
 * PRIMITIVA INTERNA — assume que quem chama já autorizou este cancelamento
 * (checagem de posse do cliente, ou RBAC de staff + assertOwnBookingAccess).
 * Não chame direto a partir de uma nova action voltada ao cliente final; use
 * cancelBookingForCustomer, que faz a checagem de posse aqui mesmo. */
export async function cancelBooking(id: string, cancelledBy?: string) {
  const [existing, rules] = await Promise.all([
    db.booking.findUniqueOrThrow({ where: { id } }),
    getResolvedRules(),
  ]);
  const check = checkCancellation(existing, rules, new Date());
  if (!check.allowed) {
    throw new Error(
      "Reserva já iniciada — não pode ser cancelada pelo cliente.",
    );
  }
  const booking = await db.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy,
      cancellationFeeInCents: check.feeInCents,
    },
  });
  await enqueueBookingNotification({
    bookingId: booking.id,
    type: "cancellation",
  });
  logger({
    organizationId: booking.organizationId,
    bookingId: booking.id,
  }).info({ feeInCents: check.feeInCents }, "booking.cancelled");
  await logAuditEvent({
    entity: "Booking",
    action: "BOOKING_CANCELLED",
    entityId: booking.id,
    actorId: cancelledBy,
  });
  return booking;
}

/** Único ponto sancionado para um cliente cancelar sua própria reserva — a
 * posse é revalidada aqui (não só na action que chama), pra que um futuro
 * caller não reintroduza IDOR ao pular a pré-checagem. */
export async function cancelBookingForCustomer(
  bookingId: string,
  expectedCustomerId: string,
  cancelledByUserId?: string,
) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  assertOwned(booking, "customerId", expectedCustomerId, "Reserva não encontrada.");
  return cancelBooking(bookingId, cancelledByUserId);
}

export function listBookings(range?: { from: Date; to: Date }) {
  return db.booking.findMany({
    where: range ? { startAt: { gte: range.from, lt: range.to } } : undefined,
    include: { service: true, customer: true, staff: true },
    orderBy: { startAt: "asc" },
  });
}

/** Reservas do cliente logado na área de conta — sempre filtradas pelo
 * customerId já resolvido da sessão (ver customerActionClient), nunca por
 * um id vindo do cliente. */
export function listBookingsForCustomer(customerId: string) {
  return db.booking.findMany({
    where: { customerId },
    include: { service: true, staff: true },
    orderBy: { startAt: "desc" },
  });
}

/**
 * Chamado pelo webhook Connect (sem contexto de tenant — a organização só é
 * conhecida via o próprio booking). `updateMany` guardado por
 * status=PENDING_PAYMENT defende contra replay/race do webhook.
 */
export async function confirmBookingFromCheckoutSession(input: {
  bookingId: string;
  sessionId: string;
  paymentIntentId: string | null;
}) {
  return runWithPlatformScope(async () => {
    const result = await db.booking.updateMany({
      where: {
        id: input.bookingId,
        stripeCheckoutSessionId: input.sessionId,
        status: "PENDING_PAYMENT",
      },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paidAt: new Date(),
        stripePaymentIntentId: input.paymentIntentId,
        expiresAt: null,
      },
    });
    if (!result.count) return null;
    const booking = await db.booking.findUnique({
      where: { id: input.bookingId },
    });
    if (booking) {
      await db.booking.update({
        where: { id: booking.id },
        data: { paymentReceivedInCents: booking.onlinePaymentAmountInCents },
      });
    }
    if (booking) {
      logger({
        organizationId: booking.organizationId,
        bookingId: booking.id,
      }).info({}, "booking.confirmed");
      await logAuditEvent({
        entity: "Booking",
        action: "PAYMENT_CAPTURED",
        entityId: booking.id,
        organizationId: booking.organizationId,
      });
      revalidateBookingCaches();
    }
    return booking;
  });
}

/**
 * Cancela um booking PENDING_PAYMENT ainda pendente para o mesmo checkout
 * session — usado por checkout.session.expired/async_payment_failed.
 */
export async function cancelPendingBookingByCheckoutSession(sessionId: string) {
  return runWithPlatformScope(async () => {
    const result = await db.booking.updateMany({
      where: { stripeCheckoutSessionId: sessionId, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (!result.count) return null;
    return db.booking.findFirst({
      where: { stripeCheckoutSessionId: sessionId },
    });
  });
}

/** Varredura de holds expirados — chamada pelo job repetível do worker. */
export async function expireStaleHolds(now = new Date()) {
  return runWithPlatformScope(async () => {
    const stale = await db.booking.findMany({
      where: { status: "PENDING_PAYMENT", expiresAt: { lt: now } },
      select: { id: true },
    });
    if (!stale.length) return [];
    await db.booking.updateMany({
      where: { id: { in: stale.map((b) => b.id) } },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    for (const b of stale) {
      logger({ bookingId: b.id }).info({}, "booking.expired");
    }
    return stale.map((b) => b.id);
  });
}

/** Customer overview stats: total bookings, completed count, total spent, and next 5 upcoming. */
export async function getCustomerOverviewStats(customerId: string) {
  const now = new Date();
  const bookings = await db.booking.findMany({
    where: { customerId },
    include: { service: true },
    orderBy: { startAt: "desc" },
  });

  const totalBookings = bookings.filter((b) => b.status !== "CANCELLED").length;
  const completedCount = bookings.filter(
    (b) => b.status === "COMPLETED",
  ).length;
  const totalSpentInCents = bookings.reduce((sum, b) => {
    if (b.status === "CANCELLED") return sum;
    return sum + (b.paymentReceivedInCents - b.refundedAmountInCents);
  }, 0);

  const upcomingBookings = bookings
    .filter((b) => b.status !== "CANCELLED" && b.startAt >= now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .slice(0, 5);

  return {
    totalBookings,
    completedCount,
    totalSpentInCents,
    upcomingBookings,
  };
}

/** Aplica um refund (parcial ou total) via payment intent — webhook Connect. */
export async function applyRefundToBooking(
  paymentIntentId: string,
  amountRefundedInCents: number,
) {
  return runWithPlatformScope(async () => {
    const booking = await db.booking.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!booking) return null;
    // Compara contra o que foi de fato cobrado (onlinePaymentAmountInCents),
    // não booking.priceInCents (preço cheio do serviço) — com deposit mode
    // ou cupom aplicado, o valor cobrado é menor que o preço, e comparar
    // contra o preço cheio classificava um reembolso 100% do cobrado como
    // PARTIALLY_REFUNDED por engano.
    const chargeAmount = booking.onlinePaymentAmountInCents;
    const paymentStatus =
      amountRefundedInCents >= chargeAmount ? "REFUNDED" : "PARTIALLY_REFUNDED";
    const updated = await db.booking.update({
      where: { id: booking.id },
      data: { paymentStatus, refundedAmountInCents: amountRefundedInCents },
    });
    await logAuditEvent({
      entity: "Booking",
      action: "PAYMENT_REFUNDED",
      entityId: booking.id,
      organizationId: booking.organizationId,
      metadata: { amountRefundedInCents },
    });
    return updated;
  });
}

/** Usado pelo worker de notificações — roda fora de contexto de tenant. */
export function getBookingForNotification(id: string) {
  return runWithPlatformScope(() =>
    db.booking.findUnique({
      where: { id },
      include: { customer: true, service: true, organization: true },
    }),
  );
}
