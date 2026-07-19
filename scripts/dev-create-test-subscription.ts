/**
 * Dev-only: cria uma Subscription + Customer reais no Stripe (modo teste) E
 * já um User + credencial (email/senha) no banco com esse mesmo e-mail, pra
 * iterar localmente no funil pay -> sign up -> onboarding sem clicar em
 * "pagar" nem preencher o formulário de criar conta toda vez — só abrir a
 * URL impressa já logado.
 *
 * Usage:
 *   tsx scripts/dev-create-test-subscription.ts --email=you@example.com --plan=STARTER --password=Test1234!
 *
 * O sessionId impresso (prefixo devbypass_) só é aceito por
 * lib/services/subscription-claim-service.ts quando STRIPE_SECRET_KEY é de
 * teste e NODE_ENV != production — nunca funciona em produção. Idempotente:
 * rodar de novo com o mesmo --email reaproveita o User já existente (sem
 * tocar na senha dele) e só cria uma nova Subscription/URL.
 */
import "dotenv/config";
import crypto from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getStripe, SaaSPlans } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((a) => a.startsWith(prefix));
  return match?.slice(prefix.length);
}

function assertTestMode() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY não é uma chave de teste (sk_test_...). Abortando.");
  }
}

async function ensureTestUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { created: false };

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.create({
      data: { id: userId, email, name: email.split("@")[0] ?? email, emailVerified: true },
    }),
    prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        providerId: "credential",
        accountId: userId,
        password: passwordHash,
      },
    }),
  ]);
  return { created: true };
}

async function main() {
  const email = arg("email");
  const password = arg("password") ?? "Test1234!";
  const planName = (arg("plan") ?? "STARTER") as keyof typeof SaaSPlans;
  if (!email) {
    throw new Error("Passe --email=<email>.");
  }
  if (!(planName in SaaSPlans)) {
    throw new Error(`Plano inválido: ${planName}. Use STARTER, GROWTH ou PRO.`);
  }

  assertTestMode();

  const plan = SaaSPlans[planName];
  if (!plan.priceId) {
    throw new Error(`Price ID não configurado para o plano ${planName} (.env).`);
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({ email });
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: plan.priceId }],
    trial_period_days: 14,
    metadata: { plan: planName },
  });

  const { created } = await ensureTestUser(email, password);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://lvh.me:3000";
  const url = `${appUrl}/onboarding?session_id=devbypass_${subscription.id}`;

  console.log("Customer criado:", customer.id);
  console.log("Subscription criada:", subscription.id, `(status: ${subscription.status})`);
  if (created) {
    console.log(`\nLogin: email=${email} senha=${password}`);
  } else {
    console.log(`\nUser já existia (${email}) — reaproveitado, senha não foi alterada.`);
  }
  console.log("\nAbra no navegador (faça login com o e-mail/senha acima se pedir):");
  console.log(url);
  console.log(
    "\nSe der DNS_PROBE_FINISHED_NXDOMAIN: roteadores com proteção DNS-rebind " +
      "(ex.: Fritz!Box) bloqueiam lvh.me — rode `pnpm dev:hosts add <slug>` " +
      "(e de novo para cada tenant novo criado no onboarding).",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
