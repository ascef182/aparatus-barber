import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";
import { hasPermission } from "@/lib/auth/permissions";
import { runWithTenant } from "@/lib/tenant-context";
import { listConversationsForStaff } from "@/lib/services/conversation-service";
import { PageContainer, PageHeader } from "@/app/_components/ui/page";
import { Badge } from "@/app/_components/ui/badge";

export default async function DashboardMessagesPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");
  const membership = await getMembership(organization.id, session.user.id);
  if (!membership || !hasPermission(membership.role, { messages: ["read"] })) redirect("/dashboard");

  const conversations = await runWithTenant(organization.id, () => listConversationsForStaff());
  const t = await getTranslations("dashboard.messages");
  const dateFormatter = new Intl.DateTimeFormat(organization.defaultLocale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: organization.timezone,
  });

  return (
    <PageContainer>
      <PageHeader title={t("title")} />
      {conversations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noConversations")}</p>
      ) : (
        <div className="grid gap-3">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/dashboard/messages/${conversation.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="font-medium">{conversation.customer.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {conversation.lastMessage?.body ?? t("lastMessage")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {conversation.unread && <Badge variant="default">{t("unread")}</Badge>}
                {conversation.lastMessageAt && (
                  <span className="text-xs text-muted-foreground">
                    {dateFormatter.format(conversation.lastMessageAt)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
