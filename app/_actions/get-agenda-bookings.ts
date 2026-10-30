"use server";

import { staffActionClient } from "@/lib/safe-action";
import { db } from "@/lib/db";
import { resolveOwnStaffBookingFilter } from "@/lib/authz";
import { z } from "zod";

/** Reservas da janela visível da agenda — com filtro de data (a query antiga
 * embutida em agenda/page.tsx trazia TODAS as reservas já criadas, sem
 * limite algum). Usada tanto pelo primeiro render (SSR) quanto pelo polling
 * client-side, pra manter os dois caminhos idênticos — mesmo filtro de
 * "próprio staff" de resolveOwnStaffBookingFilter (lib/authz.ts), pra não
 * duplicar a regra em dois lugares que podem divergir (foi exatamente isso
 * que aconteceu: a cópia em agenda/page.tsx ficou fail-open, achado na
 * Sprint 2). */
export const getAgendaBookings = staffActionClient({ booking: ["read_own"] })
  .inputSchema(z.object({ fromISO: z.string().datetime(), toISO: z.string().datetime() }))
  .action(async ({ parsedInput, ctx }) => {
    const ownStaffFilter = await resolveOwnStaffBookingFilter(ctx.membership);
    const bookings = await db.booking.findMany({
      where: {
        startAt: { gte: new Date(parsedInput.fromISO), lt: new Date(parsedInput.toISO) },
        ...ownStaffFilter,
      },
      include: { customer: true, service: true, staff: true, attachments: true },
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
      referencePhotoUrls: booking.attachments.map((attachment) => attachment.url),
    }));
  });
