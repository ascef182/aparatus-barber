import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { retrieveClaimableCheckoutSession } from "@/lib/services/subscription-claim-service";
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

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  // Sem session_id: cadastro grátis (funil /sign-up, sem Checkout Stripe).
  // Logado sem organização ainda -> wizard direto; deslogado -> /sign-up
  // primeiro (não dá pra criar Organization sem User).
  if (!sessionId) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      redirect("/sign-up");
    }
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <OnboardingWizardForm />
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
