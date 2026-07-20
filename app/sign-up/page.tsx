import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listOrganizationsForUser } from "@/lib/services/member-service";
import { getTenantUrl } from "@/lib/tenant-host";
import { SignUpForm } from "./sign-up-form";

/**
 * Entrada do funil grátis: cadastro (e-mail+senha ou Google) sem depender
 * de Checkout Stripe. Quem já tem conta cai direto no onboarding (sem
 * organização) ou no próprio dashboard (já tem organização).
 */
export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    const memberships = await listOrganizationsForUser(session.user.id);
    if (memberships.length > 0) {
      redirect(getTenantUrl(memberships[0]!.organization.slug, "/dashboard"));
    }
    redirect("/onboarding");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignUpForm />
    </main>
  );
}
