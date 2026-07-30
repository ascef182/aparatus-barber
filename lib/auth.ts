import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization, twoFactor } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { Resend } from "resend";
import { prisma } from "./prisma";
import { ac, roles } from "./auth/permissions";
import { authSecondaryStorage } from "./rate-limit";
import { getRootDomain } from "./tenant-host";
import { getEmailTranslator } from "./email-translations";
import { renderBrandedEmail } from "./email-template";

// Mesma derivação de protocolo de lib/tenant-host.ts (getTenantUrl/getRootUrl)
// — "https://" quebra em dev local, Next dev não serve TLS.
const authProtocol = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").protocol;
const authRootDomain = getRootDomain();

// Construído sob demanda (não no module scope): o Resend SDK valida a API
// key no construtor e lança se ausente/vazia — isso quebraria todo o resto
// do módulo (auth.ts é importado por praticamente toda a camada de
// actions via safe-action.ts) em qualquer ambiente sem RESEND_API_KEY
// configurada, mesmo quando reset de senha nunca é usado.
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}
const emailFrom = process.env.EMAIL_FROM ?? "Bladiq <bookings@bladiq.com>";

// O SDK do Resend (v3+) retorna { data, error } em vez de lançar em erro de
// API (domínio não verificado, remetente inválido, etc.) — sem este check,
// falhas de entrega ficam invisíveis: a rota do Better Auth responde 200
// mesmo com o e-mail nunca saindo.
//
// Fora de produção, se o Resend falhar (ex.: domínio remetente não
// verificado na conta usada em dev), não bloqueia o fluxo: loga o conteúdo
// do e-mail (com a URL de verificação/reset) no console e segue — permite
// testar verificação de e-mail e redefinição de senha localmente sem
// depender de um domínio verificado. Em produção o comportamento não muda:
// continua lançando, para nunca mascarar uma falha real de entrega.
async function sendEmail(params: { to: string; subject: string; html: string; text: string }) {
  const { error } = await getResend().emails.send({ from: emailFrom, ...params });
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[dev] Resend falhou (${error.message}); e-mail não enviado de verdade — conteúdo abaixo:\n` +
          `Para: ${params.to}\nAssunto: ${params.subject}\n${params.text}`,
      );
      return;
    }
    throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
  }
}

// Better Auth não tipa additionalFields custom (locale é uma coluna real em
// User, mas não registrada em additionalFields) — leitura best-effort via
// cast, sem quebrar se ausente. getEmailTranslator já cai pro default se
// undefined/inválido.
function userLocale(user: object): string | undefined {
  return (user as { locale?: string | null }).locale ?? undefined;
}

export const auth = betterAuth({
  appName: "Bladiq",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Sessão do login criado no fluxo de assinatura (pagou -> cadastrou com o
  // e-mail do pagamento -> reivindica a subscription). Não BLOQUEAMOS no
  // e-mail verificado (pedir isso logo após o pagamento seria fricção ruim
  // no funil — checkout do Stripe já aceita qualquer e-mail digitado, sem
  // prova de posse). Mas enviamos a verificação automaticamente: se
  // alguém pagar e reivindicar uma conta com o e-mail de outra pessoa, o
  // dono real da caixa de entrada recebe o link e pode agir.
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const t = getEmailTranslator(userLocale(user));
      const { html, text } = renderBrandedEmail({
        preheader: t("passwordReset.heading"),
        heading: t("passwordReset.heading"),
        paragraphs: [t("passwordReset.body")],
        ctaLabel: t("passwordReset.cta"),
        ctaUrl: url,
        footerNote: t("genericFooter"),
      });
      await sendEmail({ to: user.email, subject: t("passwordReset.subject"), html, text });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const t = getEmailTranslator(userLocale(user));
      const { html, text } = renderBrandedEmail({
        preheader: t("emailVerification.heading"),
        heading: t("emailVerification.heading"),
        paragraphs: [t("emailVerification.body")],
        ctaLabel: t("emailVerification.cta"),
        ctaUrl: url,
        footerNote: t("genericFooter"),
      });
      await sendEmail({ to: user.email, subject: t("emailVerification.subject"), html, text });
    },
  },
  session: {
    // Sessão expira em 30 dias de inatividade (não infinita).
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  // Cookie de sessão: Better Auth usa SameSite=Lax por padrão (verificado em
  // node_modules/better-auth/dist/cookies/index.mjs) — deliberadamente NÃO
  // Strict. O callback do Google OAuth é uma navegação top-level cross-site
  // (accounts.google.com -> /api/auth/callback/google); com Strict o cookie
  // de state/correlação não seria enviado nesse retorno e o login OAuth
  // quebraria. Lax ainda bloqueia o cookie em requests cross-site que não
  // são navegação top-level (POST/fetch de outra origem), que é o vetor
  // relevante de CSRF — subdomínios de tenant (crossSubDomainCookies) são
  // "same-site" entre si, então não são afetados por essa restrição.
  // Redis como secondary storage: o rate limit (e o cache de sessão) do
  // Better Auth funcionam corretamente com web escalado horizontalmente
  // (memória local não seria compartilhada entre instâncias).
  secondaryStorage: authSecondaryStorage,
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "secondary-storage",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      // Password reset: máximo 1 requisição a cada 5 minutos (300s) por IP.
      // Previne brute force em contas via email de reset (confirmação de
      // existência, inundação de emails, etc.).
      "/request-password-reset": { window: 300, max: 1 },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  // Sem isso, o cookie de sessão fica preso ao host que o emitiu (domínio
  // raiz, onde acontece signup/login) e nunca é enviado em requests para
  // {slug}.{root} — o dashboard do tenant recém-criado via onboarding (ou
  // do convite aceito) via qualquer sessão como não-autenticada. Domain
  // derivado automaticamente do hostname de BETTER_AUTH_URL.
  advanced: {
    crossSubDomainCookies: { enabled: true },
  },
  // crossSubDomainCookies faz o cookie de sessão chegar em qualquer
  // subdomínio, mas o origin-check (CSRF) do Better Auth é independente
  // disso: sem confiar explicitamente no wildcard de tenant, toda chamada
  // de mutação feita a partir de {slug}.{root} (signOut, twoFactor.*, etc.)
  // recebe 403 mesmo com sessão válida — é o domínio inteiro do dashboard,
  // não um caso raro.
  trustedOrigins: [`${authProtocol}//${authRootDomain}`, `${authProtocol}//*.${authRootDomain}`],
  plugins: [
    // Organization = tenant (barbearia/rede). Roles customizados em
    // lib/auth/permissions.ts. Ver plano de reestruturação, seções 2 e 5.
    organization({
      ac,
      roles,
      creatorRole: "owner",
    }),
    // SuperAdmin da plataforma (User.role = "superadmin") + impersonation.
    // "superadmin" precisa existir no `roles` do próprio plugin admin (que é
    // independente dos roles de organização) — reaproveita os statements
    // padrão do plugin, só renomeando "admin" -> "superadmin".
    admin({
      roles: { superadmin: adminAc, user: userAc },
      adminRoles: ["superadmin"],
    }),
    // MFA (TOTP + backup codes) — obrigatório p/ owners e superadmin
    // (enforcement na Fase 5, ver plano seção 8.1).
    twoFactor(),
  ],
});
