import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listOrganizationsForUser } from "@/lib/services/member-service";
import { getTenantUrl } from "@/lib/tenant-host";
import { AuthSplitLayout } from "@/app/_components/auth-split-layout";
import { SignUpForm } from "./sign-up-form";

/**
 * Entrada do funil grátis: cadastro (e-mail+senha ou Google) sem depender
 * de Checkout Stripe. Quem já tem conta cai direto no onboarding (sem
 * organização) ou no próprio dashboard (já tem organização).
 */
const PLAN_SLUGS = ["starter", "growth", "pro"] as const;

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const t = await getTranslations("signUp");
  const { plan: rawPlan } = await searchParams;
  const plan = PLAN_SLUGS.find((slug) => slug === rawPlan?.toLowerCase());

  if (session?.user) {
    const memberships = await listOrganizationsForUser(session.user.id);
    if (memberships.length > 0) {
      redirect(getTenantUrl(memberships[0]!.organization.slug, "/dashboard"));
    }
    redirect(plan ? `/onboarding?plan=${plan}` : "/onboarding");
  }

  return (
    <AuthSplitLayout quote={t("quote")} quoteAuthor={t("quoteAuthor")}>
      <SignUpForm plan={plan} />
    </AuthSplitLayout>
  );
}
