import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { hasPermission } from "@/lib/auth/permissions";
import { runWithTenant } from "@/lib/tenant-context";
import { getConversationForStaff } from "@/lib/services/conversation-service";
import { PageContainer, PageHeader } from "@/app/_components/ui/page";
import { ConversationThread } from "./conversation-thread";

export default async function DashboardConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");
  const membership = await getMembership(organization.id, session.user.id);
  if (!membership || !hasPermission(membership.role, { messages: ["read"] })) redirect("/dashboard");

  const conversation = await runWithTenant(organization.id, () => getConversationForStaff(conversationId));
  if (!conversation) notFound();

  const t = await getTranslations("dashboard.messages");
  const canReply = hasPermission(membership.role, { messages: ["reply"] });

  return (
    <PageContainer>
      <PageHeader title={conversation.customer.name} description={t("customerLabel")} />
      <ConversationThread
        conversationId={conversation.id}
        canReply={canReply}
        initialMessages={conversation.messages.map((message) => ({
          id: message.id,
          senderType: message.senderType,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
        }))}
      />
    </PageContainer>
  );
}
