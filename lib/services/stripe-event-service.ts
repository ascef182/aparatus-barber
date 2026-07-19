import { prisma } from "@/lib/prisma";

/**
 * Idempotência de webhooks Stripe: StripeEvent.id é a chave primária (o
 * próprio Stripe event id). Retorna false quando o evento já foi
 * processado (insert falha por unique violation) — o caller deve então
 * responder 200 sem reprocessar o payload.
 */
export async function recordStripeEventOnce(event: {
  id: string;
  type: string;
  accountId?: string | null;
}): Promise<boolean> {
  try {
    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type, accountId: event.accountId ?? null },
    });
    return true;
  } catch {
    return false;
  }
}
