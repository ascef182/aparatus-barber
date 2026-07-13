"use server";
import { authActionClient } from "@/lib/safe-action";
import {
  createBooking as createBookingRecord,
  findConflictingBooking,
} from "@/lib/services/booking-service";
import { getServiceById } from "@/lib/services/barbershop-service";
import { returnValidationErrors } from "next-safe-action";
import { z } from "zod";

const inputSchema = z.object({
  serviceId: z.uuid(),
  date: z.date(),
});

export const createBooking = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput: { serviceId, date }, ctx }) => {
    const service = await getServiceById(serviceId);
    if (!service) {
      returnValidationErrors(inputSchema, {
        _errors: ["Service not found"],
      });
    }
    const existingBooking = await findConflictingBooking(
      service.barbershopId,
      date,
    );
    if (existingBooking) {
      returnValidationErrors(inputSchema, {
        _errors: ["Já existe um agendamento para essa data."],
      });
    }
    return createBookingRecord({
      serviceId,
      date,
      userId: ctx.user.id,
      barbershopId: service.barbershopId,
    });
  });
