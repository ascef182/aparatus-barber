"use server";

import { ActionError, customerActionClient } from "@/lib/safe-action";
import { cancelBooking } from "@/lib/services/booking-service";
import { db } from "@/lib/db";
import { z } from "zod";

/** Cancelamento pelo próprio cliente — só permitido na reserva que
 * pertence ao Customer da sessão (ctx.customer), nunca por bookingId
 * bastar sozinho. */
export const cancelMyBooking = customerActionClient
  .inputSchema(z.object({ bookingId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const booking = await db.booking.findUnique({ where: { id: parsedInput.bookingId } });
    if (!booking || booking.customerId !== ctx.customer.id) {
      throw new ActionError("Reserva não encontrada.");
    }
    try {
      return await cancelBooking(booking.id, ctx.user.id);
    } catch (error) {
      if (error instanceof Error) throw new ActionError(error.message);
      throw error;
    }
  });
