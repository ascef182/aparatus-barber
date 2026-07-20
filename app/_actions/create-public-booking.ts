"use server";

import { publicTenantActionClient, ActionError } from "@/lib/safe-action";
import { createBooking } from "@/lib/services/booking-service";
import { z } from "zod";

const inputSchema = z.object({
  serviceId: z.uuid(),
  staffId: z.uuid(),
  startAt: z.coerce.date(),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().max(40).optional(),
    locale: z.enum(["de", "en", "pt"]).optional(),
  }),
});

export const createPublicBooking = publicTenantActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput }) => {
    try {
      return await createBooking(parsedInput);
    } catch (error) {
      if (error instanceof Error) throw new ActionError(error.message);
      throw error;
    }
  });
