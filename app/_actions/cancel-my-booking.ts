"use server";

import { ActionError, customerActionClient } from "@/lib/safe-action";
import { cancelBookingForCustomer } from "@/lib/services/booking-service";
import { z } from "zod";

/** Cancelamento pelo próprio cliente — só permitido na reserva que
 * pertence ao Customer da sessão (ctx.customer), nunca por bookingId
 * bastar sozinho. A checagem de posse vive em cancelBookingForCustomer. */
export const cancelMyBooking = customerActionClient
  .inputSchema(z.object({ bookingId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    try {
      return await cancelBookingForCustomer(
        parsedInput.bookingId,
        ctx.customer.id,
        ctx.user.id,
      );
    } catch (error) {
      if (error instanceof Error) throw new ActionError(error.message);
      throw error;
    }
  });
