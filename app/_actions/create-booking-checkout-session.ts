"use server";
import { authActionClient } from "@/lib/safe-action";
import { getServiceWithBarbershop } from "@/lib/services/barbershop-service";
import { returnValidationErrors } from "next-safe-action";
import { z } from "zod";
import Stripe from "stripe";
import { format } from "date-fns";

const inputSchema = z.object({
  serviceId: z.uuid(),
  date: z.date(),
});

export const createBookingCheckoutSession = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput: { serviceId, date }, ctx }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    const service = await getServiceWithBarbershop(serviceId);
    if (!service) {
      returnValidationErrors(inputSchema, {
        _errors: ["Service not found"],
      });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
      metadata: {
        serviceId: service.id,
        barbershopId: service.barbershopId,
        userId: ctx.user.id,
        date: date.toISOString(),
      },
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: service.priceInCents,
            product_data: {
              name: `${service.barbershop.name} - ${service.name} em ${format(date, "dd/MM/yyyy HH:mm")}`,
              description: service.description,
              images: [service.imageUrl],
            },
          },
          quantity: 1,
        },
      ],
    });
    return checkoutSession;
  });
