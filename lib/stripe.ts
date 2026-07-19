import Stripe from "stripe";
import { logger } from "@/lib/logger";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export const SaaSPlans = {
  STARTER: { priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY, locations: 1, staff: 5 },
  GROWTH: { priceId: process.env.STRIPE_PRICE_GROWTH_MONTHLY, locations: 3, staff: 20 },
  PRO: { priceId: process.env.STRIPE_PRICE_PRO_MONTHLY, locations: null, staff: null },
} as const;

/**
 * Stripe rejeita a criação inteira da sessão se a conta conectada estiver em
 * um país sem suporte a Stripe Tax (ex.: contas de teste fora da UE/EUA) —
 * sem isso, o checkout inteiro fica bloqueado em vez de só não calcular
 * imposto. Cai para sem automatic_tax só nesse caso específico; qualquer
 * outro erro do Stripe continua propagando normalmente.
 */
export async function createTaxAwareSubscriptionCheckout(
  params: Omit<
    Stripe.Checkout.SessionCreateParams,
    "mode" | "automatic_tax" | "tax_id_collection" | "billing_address_collection"
  >,
) {
  const stripe = getStripe();
  const withTax: Stripe.Checkout.SessionCreateParams = {
    ...params,
    mode: "subscription",
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
  };
  try {
    return await stripe.checkout.sessions.create(withTax);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "stripe_tax_inactive") {
      logger().warn({ err: error }, "stripe.automatic_tax_unsupported_fallback");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure só para remover os campos de tax
      const { automatic_tax, tax_id_collection, ...withoutTax } = withTax;
      return stripe.checkout.sessions.create(withoutTax);
    }
    throw error;
  }
}
