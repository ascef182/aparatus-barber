import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { runWithTenant } from "@/lib/tenant-context";
import { findOrCreateCustomerForUser } from "@/lib/services/customer-service";
import { ProfileForm } from "./profile-form";

export default async function AccountProfilePage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");

  const customer = await runWithTenant(organization.id, () =>
    findOrCreateCustomerForUser({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    }),
  );

  const t = await getTranslations("account.profile");

  return (
    <section>
      <header className="border-b bg-background p-5 md:p-8 md:pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      </header>
      <div className="max-w-md p-5 md:p-8">
        <ProfileForm
          initialName={customer.name}
          initialEmail={customer.email}
          initialPhone={customer.phone}
        />
      </div>
    </section>
  );
}
