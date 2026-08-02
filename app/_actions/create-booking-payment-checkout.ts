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
    // onlinePaymentAmountInCents já vem calculado (deposit % + desconto de
    // cupom aplicados) de createBooking() — recalcular aqui a partir de
    // booking.priceInCents cru ignoraria qualquer cupom resgatado e cobraria
    // o preço cheio mesmo com desconto válido aplicado na criação.
    const amount = booking.onlinePaymentAmountInCents;
    if (!process.env.NEXT_PUBLIC_APP_URL) throw new ActionError("NEXT_PUBLIC_APP_URL não configurada.");
    // Bug corrigido: o retorno do Stripe Checkout ia pro domínio raiz
    // (NEXT_PUBLIC_APP_URL), não pro subdomínio do tenant onde o wizard
    // roda — o cliente pagava e caía na home de marketing, sem nunca ver
    // o toast de confirmação/cancelamento (BookingStatusToast só existe em
    // app/t/[slug]/page.tsx). getTenantUrl mantém o cliente no tenant certo.
    const successUrl = getTenantUrl(ctx.organization.slug, "/?booking=success");
    const cancelUrl = getTenantUrl(ctx.organization.slug, "/?booking=canceled");
    // Taxa da plataforma: 2,4% sobre o valor pago pelo cliente. Direct charge
    // (via header stripeAccount) já debita a taxa de processamento do
    // próprio Stripe da conta conectada do barbeiro — o application_fee_amount
    // é cobrado por cima disso, então o repasse líquido do barbeiro absorve
    // as duas taxas, como decidido com o owner.
    const PLATFORM_FEE_RATE = 0.024;
    const applicationFeeAmount = Math.round(amount * PLATFORM_FEE_RATE);
    const session = await getStripe().checkout.sessions.create({ mode: "payment", line_items: [{ price_data: { currency: booking.currency.toLowerCase(), unit_amount: amount, product_data: { name: booking.service.name } }, quantity: 1 }], payment_intent_data: { application_fee_amount: applicationFeeAmount }, metadata: { kind: "booking", bookingId: booking.id, organizationId: ctx.organization.id }, success_url: successUrl, cancel_url: cancelUrl }, { stripeAccount: ctx.organization.stripeConnectAccountId });
    await db.booking.update({ where: { id: booking.id }, data: { stripeCheckoutSessionId: session.id } });
    return { id: session.id, url: session.url };
  });
