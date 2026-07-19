import { getTenantUrl } from "@/lib/tenant-host";
import {
  listOrganizationSummaries,
  listRecentAuditEvents,
} from "@/lib/services/platform-admin-service";
import { Badge } from "@/app/_components/ui/badge";
import { requireSuperadmin } from "./_lib/require-superadmin";

// Ações que representam falha/atenção no feed — destacadas em vermelho.
const FAILURE_ACTIONS = new Set(["ONBOARDING_FAILED"]);

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

function subscriptionBadgeVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "ACTIVE" || status === "TRIALING") return "default";
  if (status === "PAST_DUE" || status === "CANCELED") return "destructive";
  return "secondary";
}

export default async function SuperadminOverviewPage() {
  await requireSuperadmin();

  const [organizations, events] = await Promise.all([
    listOrganizationSummaries(),
    listRecentAuditEvents(50),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-3 font-semibold">Organizações ({organizations.length})</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-2">Nome</th>
                <th className="p-2">Slug</th>
                <th className="p-2">Plano</th>
                <th className="p-2">Assinatura</th>
                <th className="p-2">Status</th>
                <th className="p-2">Trial até</th>
                <th className="p-2">Criada em</th>
                <th className="p-2 text-right">Membros</th>
                <th className="p-2 text-right">Bookings</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-t">
                  <td className="p-2 font-medium">{org.name}</td>
                  <td className="p-2">
                    <a
                      href={getTenantUrl(org.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs underline"
                    >
                      {org.slug}
                    </a>
                  </td>
                  <td className="p-2">{org.subscriptionPlan ?? "—"}</td>
                  <td className="p-2">
                    <Badge variant={subscriptionBadgeVariant(org.subscriptionStatus)}>
                      {org.subscriptionStatus}
                    </Badge>
                  </td>
                  <td className="p-2">{org.status}</td>
                  <td className="p-2">
                    {org.trialEndsAt ? dateFormat.format(org.trialEndsAt) : "—"}
                  </td>
                  <td className="p-2">{dateFormat.format(org.createdAt)}</td>
                  <td className="p-2 text-right">{org._count.members}</td>
                  <td className="p-2 text-right">{org._count.bookings}</td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={9}>
                    Nenhuma organização ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Eventos recentes</h2>
        <ul className="flex flex-col gap-1 text-xs">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
              <span className="text-muted-foreground">{dateFormat.format(event.createdAt)}</span>
              <span
                className={
                  FAILURE_ACTIONS.has(event.action)
                    ? "font-semibold text-destructive"
                    : "font-semibold"
                }
              >
                {event.action}
              </span>
              <span className="text-muted-foreground">
                {event.entity}
                {event.entityId ? ` (${event.entityId})` : ""}
              </span>
              {event.organizationName && <Badge variant="secondary">{event.organizationName}</Badge>}
            </li>
          ))}
          {events.length === 0 && (
            <li className="rounded-md border p-4 text-muted-foreground">Nenhum evento ainda.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
