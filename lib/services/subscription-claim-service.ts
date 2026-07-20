import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export type ClaimableSubscription = {
  email: string;
  plan: "STARTER" | "GROWTH" | "PRO";
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
};

function mapStatus(status: Stripe.Subscription.Status): ClaimableSubscription["subscriptionStatus"] {
  if (status === "active") return "ACTIVE";
  if (status === "trialing") return "TRIALING";
  if (status === "past_due") return "PAST_DUE";
  return "CANCELED";
}

const DEV_BYPASS_PREFIX = "devbypass_";

/**
 * O SDK do Stripe LANÇA StripeInvalidRequestError para IDs desconhecidos ou
 * malformados (não retorna null) — sem isto, /onboarding?session_id=<lixo>
 * vira erro 500 em vez do cartão de "sessão inválida". Erros de rede/auth
 * continuam propagando (são falha nossa, não input ruim do usuário).
 */
function isInvalidStripeIdError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: string }).type === "StripeInvalidRequestError"
  );
}

/**
 * Só ativa em dev local: NODE_ENV de produção sempre bloqueia (mesmo que o
 * prefixo apareça por acidente em algum sessionId real), e a chave Stripe
 * precisa ser de teste — duas checagens independentes, não uma flag só,
 * pra nenhuma delas isoladamente conseguir ligar isto em produção.
 * Ver scripts/dev-create-test-subscription.ts (gera a Subscription real de
 * teste que esse id referencia).
 */
function isDevBypassAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    !!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
  );
}

async function retrieveDevBypassSubscription(
  subscriptionId: string,
): Promise<ClaimableSubscription | null> {
  let subscription: Stripe.Subscription;
  try {
    subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
      expand: ["customer"],
    });
  } catch (error) {
    if (isInvalidStripeIdError(error)) return null;
    throw error;
  }
  const customer = subscription.customer as Stripe.Customer | Stripe.DeletedCustomer;
  const email = "email" in customer ? customer.email : null;
  const plan = subscription.metadata.plan as ClaimableSubscription["plan"] | undefined;
  if (!email || !plan) return null;

  return {
    email,
    plan,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: mapStatus(subscription.status),
    currentPeriodEnd: new Date(subscription.items.data[0]!.current_period_end * 1000),
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  };
}

/**
 * Retoma um Checkout Session criado ANTES de existir conta/organização
 * (app/_actions/start-plan-checkout.ts) — revalida tudo server-side, nunca
 * confia em plan/email vindos do cliente. Usado por /onboarding no retorno
 * do Stripe e pela action claimSubscriptionAndCreateOrganization.
 */
export async function retrieveClaimableCheckoutSession(
  sessionId: string,
): Promise<ClaimableSubscription | null> {
  if (sessionId.startsWith(DEV_BYPASS_PREFIX) && isDevBypassAllowed()) {
    return retrieveDevBypassSubscription(sessionId.slice(DEV_BYPASS_PREFIX.length));
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });
  } catch (error) {
    if (isInvalidStripeIdError(error)) return null;
    throw error;
  }
  if (session.mode !== "subscription" || session.status !== "complete") return null;

  const email = session.customer_details?.email;
  const subscription = session.subscription as Stripe.Subscription | null;
  const plan = subscription?.metadata.plan as ClaimableSubscription["plan"] | undefined;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!email || !subscription || !plan || !customerId) return null;

  return {
    email,
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: mapStatus(subscription.status),
    currentPeriodEnd: new Date(subscription.items.data[0]!.current_period_end * 1000),
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  };
}
