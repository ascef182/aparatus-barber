"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, staffWriteActionClient } from "@/lib/safe-action";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/services/audit-service";

const bookingInput = z.object({ bookingId: z.uuid() });

async function assertOperationalAccess(bookingId: string, membershipId: string, role: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new ActionError("Agendamento não encontrado.");
  if (role === "professional") {
    const staff = await db.staff.findFirst({ where: { memberId: membershipId }, select: { id: true } });
    if (!staff || staff.id !== booking.staffId) throw new ActionError("Você só pode atualizar seus próprios atendimentos.");
  }
  if (["CANCELLED", "NO_SHOW"].includes(booking.status)) throw new ActionError("Este agendamento não pode mais ser atualizado.");
  return booking;
}

export const completeBooking = staffWriteActionClient({ booking: ["update"] })
  .inputSchema(bookingInput)
  .action(async ({ parsedInput, ctx }) => {
    const booking = await assertOperationalAccess(parsedInput.bookingId, ctx.membership.id, ctx.membership.role);
    await db.booking.update({ where: { id: booking.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    await logAuditEvent({ entity: "Booking", action: "BOOKING_COMPLETED", entityId: booking.id, actorId: ctx.user.id });
    revalidatePath("/dashboard"); revalidatePath("/dashboard/agenda");
    return { ok: true };
  });

export const markBookingNoShow = staffWriteActionClient({ booking: ["update"] })
  .inputSchema(bookingInput)
  .action(async ({ parsedInput, ctx }) => {
    const booking = await assertOperationalAccess(parsedInput.bookingId, ctx.membership.id, ctx.membership.role);
    await db.$transaction([
      db.booking.update({ where: { id: booking.id }, data: { status: "NO_SHOW", noShowAt: new Date() } }),
      db.customer.update({ where: { id: booking.customerId }, data: { noShowCount: { increment: 1 } } }),
    ]);
    await logAuditEvent({ entity: "Booking", action: "BOOKING_NO_SHOW", entityId: booking.id, actorId: ctx.user.id });
    revalidatePath("/dashboard"); revalidatePath("/dashboard/agenda");
    return { ok: true };
  });

export const recordOnSitePayment = staffWriteActionClient({ booking: ["update"] })
  .inputSchema(bookingInput)
  .action(async ({ parsedInput, ctx }) => {
    const booking = await assertOperationalAccess(parsedInput.bookingId, ctx.membership.id, ctx.membership.role);
    const outstanding = Math.max(0, booking.priceInCents - booking.discountInCents - booking.paymentReceivedInCents);
    if (!outstanding) throw new ActionError("Este agendamento já está quitado.");
    await db.booking.update({ where: { id: booking.id }, data: { paymentReceivedInCents: { increment: outstanding }, paidAt: new Date() } });
    await logAuditEvent({ entity: "Booking", action: "PAYMENT_RECORDED_ON_SITE", entityId: booking.id, actorId: ctx.user.id, metadata: { amountInCents: outstanding } });
    revalidatePath("/dashboard"); revalidatePath("/dashboard/agenda");
    return { amountInCents: outstanding };
  });
