"use server";

import { publicTenantActionClient, ActionError } from "@/lib/safe-action";
import { createBooking } from "@/lib/services/booking-service";
import { createPublicBookingSchema } from "./create-public-booking.schemas";

export const createPublicBooking = publicTenantActionClient
  .inputSchema(createPublicBookingSchema)
  .action(async ({ parsedInput }) => {
    try {
      return await createBooking(parsedInput);
    } catch (error) {
      if (error instanceof Error) throw new ActionError(error.message);
      throw error;
    }
  });
