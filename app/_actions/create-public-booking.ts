"use server";

import { publicTenantActionClient, ActionError } from "@/lib/safe-action";
import { createBooking } from "@/lib/services/booking-service";
import { createBookingUploadToken } from "@/lib/booking-upload-token";
import { createPublicBookingSchema } from "./create-public-booking.schemas";

export const createPublicBooking = publicTenantActionClient
  .inputSchema(createPublicBookingSchema)
  .action(async ({ parsedInput }) => {
    try {
      const booking = await createBooking(parsedInput);
      return { booking, upload: createBookingUploadToken(booking.id) };
    } catch (error) {
      if (error instanceof Error) throw new ActionError(error.message);
      throw error;
    }
  });
