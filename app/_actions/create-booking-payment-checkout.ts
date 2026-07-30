"use server";

import { publicTenantActionClient, ActionError } from "@/lib/safe-action";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { getTenantUrl } from "@/lib/tenant-host";
import { z } from "zod";

export const createBookingPaymentCheckout = publicTenantActionClient
  .inputSchema(z.object({ bookingId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const booking = await db.booking.findUnique({ where: { id: parsedInput.bookingId }, include: { service: true } });
    if (!booking || booking.status !== "PENDING_PAYMENT" || !booking.expiresAt || booking.expiresAt < new Date()) throw new ActionError("A reserva expirou. Escolha um horário novamente.");
    if (!ctx.organization.stripeConnectAccountId || !ctx.organization.chargesEnabled) throw new ActionError("Pagamento online ainda não está disponível.");
    const amount = booking.paymentMode === "DEPOSIT" ? Math.round(booking.priceInCents * (booking.service.depositPercent ?? 0) / 100) : booking.priceInCents;
    if (!process.env.NEXT_PUBLIC_APP_URL) throw new ActionError("NEXT_PUBLIC_APP_URL não configurada.");
    // Bug corrigido: o retorno do Stripe Checkout ia pro domínio raiz
    // (NEXT_PUBLIC_APP_URL), não pro subdomínio do tenant onde o wizard
    // roda — o cliente pagava e caía na home de marketing, sem nunca ver
    // o toast de confirmação/cancelamento (BookingStatusToast só existe em
    // app/t/[slug]/page.tsx). getTenantUrl mantém o cliente no tenant certo.
    const successUrl = getTenantUrl(ctx.organization.slug, "/?booking=success");
    const cancelUrl = getTenantUrl(ctx.organization.slug, "/?booking=canceled");
    const session = await getStripe().checkout.sessions.create({ mode: "payment", line_items: [{ price_data: { currency: booking.currency.toLowerCase(), unit_amount: amount, product_data: { name: booking.service.name } }, quantity: 1 }], metadata: { kind: "booking", bookingId: booking.id, organizationId: ctx.organization.id }, success_url: successUrl, cancel_url: cancelUrl }, { stripeAccount: ctx.organization.stripeConnectAccountId });
    await db.booking.update({ where: { id: booking.id }, data: { stripeCheckoutSessionId: session.id } });
    return { id: session.id, url: session.url };
  });
