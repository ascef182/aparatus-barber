"use server";

import { staffActionClient } from "@/lib/safe-action";
import { db } from "@/lib/db";
import { getOwnStaffId } from "@/lib/authz";
import { z } from "zod";

/** Reservas da janela visível da agenda — com filtro de data (a query antiga
 * embutida em agenda/page.tsx trazia TODAS as reservas já criadas, sem
 * limite algum). Usada tanto pelo primeiro render (SSR) quanto pelo polling
 * client-side, pra manter os dois caminhos idênticos. */
export const getAgendaBookings = staffActionClient({ booking: ["read_own"] })
  .inputSchema(z.object({ fromISO: z.string().datetime(), toISO: z.string().datetime() }))
  .action(async ({ parsedInput, ctx }) => {
    let staffIdFilter: { staffId: string } | undefined;
    if (ctx.membership.role === "professional") {
      const ownStaffId = await getOwnStaffId(ctx.membership.id);
      // Professional sem Staff vinculado não é dono de nada — fail-closed,
      // nunca retorna a agenda inteira do tenant.
      if (!ownStaffId) return [];
      staffIdFilter = { staffId: ownStaffId };
    }
    const bookings = await db.booking.findMany({
      where: {
        startAt: { gte: new Date(parsedInput.fromISO), lt: new Date(parsedInput.toISO) },
        ...staffIdFilter,
      },
      include: { customer: true, service: true, staff: true },
      orderBy: { startAt: "asc" },
    });
    return bookings.map((booking) => ({
      id: booking.id,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      customer: booking.customer.name,
      service: booking.service.name,
      staffId: booking.staffId,
      staff: booking.staff.displayName,
      status: booking.status,
      paymentReceivedInCents: booking.paymentReceivedInCents,
      priceInCents: booking.priceInCents,
      discountInCents: booking.discountInCents,
    }));
  });
