"use server";

import { authActionClient } from "@/lib/safe-action";
import { listBookingsForDay } from "@/lib/services/booking-service";
import z from "zod";
import { format } from "date-fns";

const inputSchema = z.object({
  barbershopId: z.string(),
  date: z.date(),
});

// Grade fixa provisória — substituída pelo motor de disponibilidade
// (working hours por profissional + duração de serviço) na Fase 2.
const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

export const getDateAvailableTimeSlots = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput: { barbershopId, date } }) => {
    const bookings = await listBookingsForDay(barbershopId, date);
    const occupiedSlots = bookings.map((booking) =>
      format(booking.date, "HH:mm"),
    );
    return TIME_SLOTS.filter((slot) => !occupiedSlots.includes(slot));
  });
