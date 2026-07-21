"use server";

import { ActionError, customerActionClient } from "@/lib/safe-action";
import { createBooking } from "@/lib/services/booking-service";
import { z } from "zod";

/** Reserva feita por um cliente logado na área de conta — identidade vem
 * da sessão (ctx.customer, já resolvido pelo customerActionClient), o
 * cliente nunca informa nome/e-mail de novo. */
export const createCustomerBooking = customerActionClient
  .inputSchema(z.object({ serviceId: z.uuid(), staffId: z.uuid(), startAt: z.coerce.date() }))
  .action(async ({ parsedInput, ctx }) => {
    try {
      return await createBooking({
        ...parsedInput,
        customerUser: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email },
        source: "WEB",
      });
    } catch (error) {
      if (error instanceof Error) throw new ActionError(error.message);
      throw error;
    }
  });
