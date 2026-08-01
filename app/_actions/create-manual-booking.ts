"use server";

import { ActionError, staffWriteActionClient } from "@/lib/safe-action";
import { createBooking } from "@/lib/services/booking-service";
import { z } from "zod";

const inputSchema = z
  .object({
    serviceId: z.uuid(),
    staffId: z.uuid(),
    startAt: z.coerce.date(),
    customer: z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().optional(),
      phone: z.string().trim().max(40).optional(),
    }),
    couponCode: z.string().trim().min(1).max(32).optional(),
  })
  .refine((value) => Boolean(value.customer.email || value.customer.phone), {
    message: "Informe e-mail ou telefone do cliente.",
    path: ["customer", "email"],
  });

/** Reserva manual/walk-in criada pelo staff (dono/gerente/recepção) — mesma
 * engine de disponibilidade e mesma constraint do banco do wizard público,
 * só que sem exigir pagamento online (não há checkout pra um cliente presente). */
export const createManualBooking = staffWriteActionClient({ booking: ["create"] })
  .inputSchema(inputSchema)
  .action(async ({ parsedInput }) => {
    try {
      return await createBooking({ ...parsedInput, source: "DASHBOARD" });
    } catch (error) {
      if (error instanceof Error) throw new ActionError(error.message);
      throw error;
    }
  });
