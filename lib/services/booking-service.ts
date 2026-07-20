import { addMinutes } from "date-fns";
import { db } from "@/lib/db";
import { getAvailableSlots } from "@/lib/scheduling/availability";
import { requireTenantId, runWithPlatformScope } from "@/lib/tenant-context";
import { findOrCreateGuestCustomer } from "@/lib/services/customer-service";
import { getResolvedRules } from "@/lib/services/settings-service";
import { enqueueBookingNotification } from "@/lib/notifications";
import { checkCancellation } from "@/lib/rules/policies/cancellation";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/services/audit-service";

export type CreateBookingInput = {
  serviceId: string;
  staffId: string;
  startAt: Date;
  customer: { name: string; email: string; phone?: string; locale?: string };
  source?: "WEB" | "DASHBOARD";
};

/** Server-only booking boundary used by the public wizard and dashboard. */
export async function createBooking(input: CreateBookingInput) {
  const organizationId = requireTenantId();
  const [service, staff, rules] = await Promise.all([
    db.service.findUnique({ where: { id: input.serviceId } }),
    db.staff.findUnique({ where: { id: input.staffId } }),
    getResolvedRules(),
  ]);
  if (!service?.isActive || !staff?.isActive || staff.locationId !== service.locationId && service.locationId) {
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
  if (!slots.some((slot) => slot.startAt.getTime() === input.startAt.getTime())) {
    throw new Error("Este horário não está mais disponível.");
  }

  const paymentMode = service.paymentMode ?? rules.paymentMode;
  const requiresOnlinePayment = paymentMode !== "ON_SITE";
  const customer = await findOrCreateGuestCustomer(input.customer);
  const totalMinutes = service.bufferBeforeMinutes + service.durationMinutes + service.bufferAfterMinutes;
  const priceInCents = service.priceInCents;
  const chargeAmount = paymentMode === "DEPOSIT"
    ? Math.round(priceInCents * (service.depositPercent ?? 0) / 100)
    : priceInCents;

  const booking = await db.booking.create({
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
      paymentStatus: requiresOnlinePayment ? "PENDING" : "NONE",
      paymentReceivedInCents: 0,
      onlinePaymentAmountInCents: requiresOnlinePayment ? chargeAmount : 0,
      expiresAt: requiresOnlinePayment ? addMinutes(new Date(), 30) : null,
      notes: chargeAmount === priceInCents ? null : `online_amount=${chargeAmount}`,
    },
  });
  if (!requiresOnlinePayment) {
    await enqueueBookingNotification({ bookingId: booking.id, type: "confirmation" });
    await enqueueBookingNotification({ bookingId: booking.id, type: "reminder" }, Math.max(0, booking.startAt.getTime() - Date.now() - 24 * 60 * 60 * 1000));
  }
  logger({ organizationId, bookingId: booking.id }).info({ status: booking.status }, "booking.created");
  await logAuditEvent({ entity: "Booking", action: "BOOKING_CREATED", entityId: booking.id });
  return booking;
}

export async function cancelBooking(id: string, cancelledBy?: string) {
  const [existing, rules] = await Promise.all([
    db.booking.findUniqueOrThrow({ where: { id } }),
    getResolvedRules(),
  ]);
  const check = checkCancellation(existing, rules, new Date());
  if (!check.allowed) {
    throw new Error("Reserva já iniciada — não pode ser cancelada pelo cliente.");
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
  await enqueueBookingNotification({ bookingId: booking.id, type: "cancellation" });
  logger({ organizationId: booking.organizationId, bookingId: booking.id }).info(
    { feeInCents: check.feeInCents },
    "booking.cancelled",
  );
  await logAuditEvent({ entity: "Booking", action: "BOOKING_CANCELLED", entityId: booking.id, actorId: cancelledBy });
  return booking;
}

export function listBookings(range?: { from: Date; to: Date }) {
  return db.booking.findMany({
    where: range ? { startAt: { gte: range.from, lt: range.to } } : undefined,
    include: { service: true, customer: true, staff: true },
    orderBy: { startAt: "asc" },
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
      where: { id: input.bookingId, stripeCheckoutSessionId: input.sessionId, status: "PENDING_PAYMENT" },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paidAt: new Date(),
        stripePaymentIntentId: input.paymentIntentId,
        expiresAt: null,
      },
    });
    if (!result.count) return null;
    const booking = await db.booking.findUnique({ where: { id: input.bookingId } });
    if (booking) {
      await db.booking.update({ where: { id: booking.id }, data: { paymentReceivedInCents: booking.onlinePaymentAmountInCents } });
    }
    if (booking) {
      logger({ organizationId: booking.organizationId, bookingId: booking.id }).info(
        {},
        "booking.confirmed",
      );
      await logAuditEvent({
        entity: "Booking",
        action: "PAYMENT_CAPTURED",
        entityId: booking.id,
        organizationId: booking.organizationId,
      });
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
    return db.booking.findFirst({ where: { stripeCheckoutSessionId: sessionId } });
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

/** Aplica um refund (parcial ou total) via payment intent — webhook Connect. */
export async function applyRefundToBooking(paymentIntentId: string, amountRefundedInCents: number) {
  return runWithPlatformScope(async () => {
    const booking = await db.booking.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
    if (!booking) return null;
    const chargeAmount = booking.priceInCents;
    const paymentStatus = amountRefundedInCents >= chargeAmount ? "REFUNDED" : "PARTIALLY_REFUNDED";
    const updated = await db.booking.update({ where: { id: booking.id }, data: { paymentStatus, refundedAmountInCents: amountRefundedInCents } });
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
