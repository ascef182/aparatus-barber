import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { AuthSplitLayout } from "@/app/_components/auth-split-layout";
import { BackButton } from "../../back-button";
import { CustomerSignInForm } from "./customer-sign-in-form";

export default async function AccountSignInPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/account");

  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");

  const t = await getTranslations("account.signIn");

  return (
    <div className="relative">
      <BackButton />
      <AuthSplitLayout quote={t("quote", { name: organization.name })} quoteAuthor={organization.name}>
        <CustomerSignInForm slug={slug} organizationName={organization.name} />
      </AuthSplitLayout>
    </div>
  );
}
