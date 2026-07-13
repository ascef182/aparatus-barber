"use server";
import { authActionClient } from "@/lib/safe-action";
import {
  getBookingById,
  markBookingCancelled,
} from "@/lib/services/booking-service";
import { returnValidationErrors } from "next-safe-action";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { z } from "zod";

const inputSchema = z.object({
  bookingId: z.uuid(),
});

export const cancelBooking = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput: { bookingId }, ctx }) => {
    const booking = await getBookingById(bookingId);

    if (!booking) {
      returnValidationErrors(inputSchema, {
        _errors: ["Reserva não encontrada"],
      });
    }

    if (booking.userId !== ctx.user.id) {
      returnValidationErrors(inputSchema, {
        _errors: ["Você não tem permissão para cancelar esta reserva"],
      });
    }

    if (booking.cancelled) {
      returnValidationErrors(inputSchema, {
        _errors: ["Esta reserva já foi cancelada"],
      });
    }

    if (booking.date < new Date()) {
      returnValidationErrors(inputSchema, {
        _errors: ["Não é possível cancelar reservas passadas"],
      });
    }

    if (booking.stripeChargeId) {
      if (!process.env.STRIPE_SECRET_KEY) {
        returnValidationErrors(inputSchema, {
          _errors: ["Erro ao processar reembolso. Tente novamente."],
        });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      try {
        await stripe.refunds.create({
          charge: booking.stripeChargeId,
          reason: "requested_by_customer",
        });
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError) {
          console.error("Stripe refund error:", error.message);
          returnValidationErrors(inputSchema, {
            _errors: [
              "Erro ao processar reembolso. Entre em contato com o suporte.",
            ],
          });
        }
        throw error;
      }
    }

    const updatedBooking = await markBookingCancelled(bookingId);
    revalidatePath("/bookings");
    return updatedBooking;
  });
