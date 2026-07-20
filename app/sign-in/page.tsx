import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listOrganizationsForUser } from "@/lib/services/member-service";
import { getTenantUrl } from "@/lib/tenant-host";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const t = await getTranslations("signIn");

  if (!session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <SignInForm />
      </main>
    );
  }

  const memberships = await listOrganizationsForUser(session.user.id);

  if (memberships.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("noOrgTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t("noOrgBody")}</p>
            <Button asChild>
              <Link href="/onboarding">{t("startFree")}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (memberships.length === 1) {
    redirect(getTenantUrl(memberships[0]!.organization.slug, "/dashboard"));
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("pickShopTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {memberships.map((membership) => (
            <Button key={membership.id} asChild variant="outline">
              <a href={getTenantUrl(membership.organization.slug, "/dashboard")}>
                {membership.organization.name}
              </a>
            </Button>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
