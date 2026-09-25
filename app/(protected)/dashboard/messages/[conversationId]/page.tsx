import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDashboardContext } from "@/lib/services/dashboard-context-service";
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
  const ctx = await getDashboardContext(requestHeaders);
  if (!ctx) redirect("/");
  const { organization, membership } = ctx;
  if (!hasPermission(membership.role, { messages: ["read"] })) redirect("/dashboard");

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
        customerName={conversation.customer.name}
        customerImage={conversation.customer.image}
        initialMessages={conversation.messages.map((message) => ({
          id: message.id,
          senderType: message.senderType,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
        }))}
        initialLastCustomerReadAt={conversation.lastCustomerReadAt?.toISOString() ?? null}
      />
    </PageContainer>
  );
}
