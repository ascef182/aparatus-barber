import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export function findConflictingBooking(barbershopId: string, date: Date) {
  return prisma.booking.findFirst({
    where: { barbershopId, date },
  });
}

export function createBooking(data: {
  serviceId: string;
  barbershopId: string;
  userId: string;
  date: Date;
  stripeChargeId?: string | null;
}) {
  return prisma.booking.create({ data });
}

export function getBookingById(id: string) {
  return prisma.booking.findUnique({ where: { id } });
}

export function markBookingCancelled(id: string) {
  return prisma.booking.update({
    where: { id },
    data: { cancelled: true, cancelledAt: new Date() },
  });
}

export function listUserBookings(userId: string) {
  return prisma.booking.findMany({
    where: { userId },
    include: { service: true, barbershop: true },
    orderBy: { date: "desc" },
  });
}

export function listBookingsForDay(barbershopId: string, date: Date) {
  return prisma.booking.findMany({
    where: {
      barbershopId,
      date: { gte: startOfDay(date), lte: endOfDay(date) },
    },
  });
}
