import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { runWithTenant } from "@/lib/tenant-context";
import { findOrCreateCustomerForUser } from "@/lib/services/customer-service";
import { getConversationForCustomer } from "@/lib/services/conversation-service";
import { MessageThread } from "./message-thread";

export default async function AccountMessagesPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");

  const conversation = await runWithTenant(organization.id, async () => {
    const customer = await findOrCreateCustomerForUser({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });
    return getConversationForCustomer(customer.id);
  });

  const t = await getTranslations("account.messages");

  return (
    <section className="flex h-screen flex-col md:h-full">
      <header className="border-b bg-background p-5 md:p-8 md:pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      </header>
      <MessageThread
        initialMessages={(conversation?.messages ?? []).map((message) => ({
          id: message.id,
          senderType: message.senderType,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
        }))}
      />
    </section>
  );
}
