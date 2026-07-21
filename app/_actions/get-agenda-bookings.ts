"use server";

import { staffActionClient } from "@/lib/safe-action";
import { db } from "@/lib/db";
import { z } from "zod";

/** Reservas da janela visível da agenda — com filtro de data (a query antiga
 * embutida em agenda/page.tsx trazia TODAS as reservas já criadas, sem
 * limite algum). Usada tanto pelo primeiro render (SSR) quanto pelo polling
 * client-side, pra manter os dois caminhos idênticos. */
export const getAgendaBookings = staffActionClient({ booking: ["read_own"] })
  .inputSchema(z.object({ fromISO: z.string().datetime(), toISO: z.string().datetime() }))
  .action(async ({ parsedInput, ctx }) => {
    const ownStaff = ctx.membership.role === "professional"
      ? await db.staff.findFirst({ where: { memberId: ctx.membership.id }, select: { id: true } })
      : null;
    const bookings = await db.booking.findMany({
      where: {
        startAt: { gte: new Date(parsedInput.fromISO), lt: new Date(parsedInput.toISO) },
        ...(ownStaff ? { staffId: ownStaff.id } : {}),
      },
      include: { customer: true, service: true, staff: true },
      orderBy: { startAt: "asc" },
    });
    return bookings.map((booking) => ({
      id: booking.id,
      startAt: booking.startAt.toISOString(),
      customer: booking.customer.name,
      service: booking.service.name,
      staff: booking.staff.displayName,
      status: booking.status,
      paymentReceivedInCents: booking.paymentReceivedInCents,
      priceInCents: booking.priceInCents,
      discountInCents: booking.discountInCents,
    }));
  });
