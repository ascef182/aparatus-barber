import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { retrieveClaimableCheckoutSession } from "@/lib/services/subscription-claim-service";
import { listOrganizationsForUser } from "@/lib/services/member-service";
import { getTenantUrl } from "@/lib/tenant-host";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { ClaimAccountForm } from "./claim-account-form";
import { OnboardingWizardForm } from "./onboarding-wizard-form";
import { SignOutAndContinueButton } from "./sign-out-and-continue-button";

function InvalidSession({
  title,
  body,
  cta,
  children,
}: {
  title: string;
  body: string;
  cta: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{body}</p>
          {children}
          <Button asChild variant={children ? "outline" : "default"}>
            <Link href="/">{cta}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

const PLAN_SLUGS = ["starter", "growth", "pro"] as const;
const PLAN_BY_SLUG = { starter: "STARTER", growth: "GROWTH", pro: "PRO" } as const;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; plan?: string }>;
}) {
  const { session_id: sessionId, plan: rawPlan } = await searchParams;
  const planSlug = PLAN_SLUGS.find((slug) => slug === rawPlan?.toLowerCase());

  // Sem session_id: cadastro grátis (funil /sign-up, sem Checkout Stripe).
  // Logado sem organização ainda -> wizard direto; deslogado -> /sign-up
  // primeiro (não dá pra criar Organization sem User).
  if (!sessionId) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      redirect(planSlug ? `/sign-up?plan=${planSlug}` : "/sign-up");
    }

    // Defesa em profundidade: quem já tem organização não deve ver o wizard
    // de novo (ex.: chegou aqui direto, sem passar pelo callbackURL correto
    // do botão do Google em /sign-in). Mesma lógica de app/sign-in/page.tsx.
    const memberships = await listOrganizationsForUser(session.user.id);
    if (memberships.length === 1) {
      redirect(getTenantUrl(memberships[0]!.organization.slug, "/dashboard"));
    }
    if (memberships.length > 1) {
      redirect("/sign-in");
    }

    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <OnboardingWizardForm intendedPlan={planSlug ? PLAN_BY_SLUG[planSlug] : undefined} />
      </main>
    );
  }

  const t = await getTranslations("onboarding");
  const claim = await retrieveClaimableCheckoutSession(sessionId);
  if (!claim) {
    return (
      <InvalidSession
        title={t("expiredSessionTitle")}
        body={t("expiredSessionBody")}
        cta={t("backToPricing")}
      />
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <ClaimAccountForm email={claim.email} />
      </main>
    );
  }

  if (session.user.email.toLowerCase() !== claim.email.toLowerCase()) {
    return (
      <InvalidSession
        title={t("emailMismatchTitle")}
        body={t("emailMismatchBody")}
        cta={t("backToPricing")}
      >
        <dl className="rounded-md border p-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("emailMismatchLoggedInAs")}</dt>
            <dd className="font-mono">{session.user.email}</dd>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("emailMismatchPaidWith")}</dt>
            <dd className="font-mono">{claim.email}</dd>
          </div>
        </dl>
        <SignOutAndContinueButton />
      </InvalidSession>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <OnboardingWizardForm sessionId={sessionId} />
    </main>
  );
}
