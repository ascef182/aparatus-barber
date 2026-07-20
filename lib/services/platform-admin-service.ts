import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { runWithPlatformScope } from "@/lib/tenant-context";
import type { Prisma } from "@/generated/prisma/client";

// Leituras cross-tenant do /superadmin (read-only, dono da plataforma).
// Organization NÃO é tenant-scoped (é o próprio limite do tenant) — client
// cru, como em organization-service.ts. AuditLog ESTÁ em TENANT_MODELS —
// leitura cross-tenant só via runWithPlatformScope + db (bypass explícito).

export function listOrganizationSummaries() {
  return prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true, bookings: true } } },
  });
}

export type PlatformOrganizationSummary = Prisma.PromiseReturnType<
  typeof listOrganizationSummaries
>[number];

export type PlatformAuditEvent = {
  id: string;
  createdAt: Date;
  action: string;
  entity: string;
  entityId: string | null;
  organizationId: string | null;
  organizationName: string | null;
  metadata: unknown;
};

export async function listRecentAuditEvents(limit = 50): Promise<PlatformAuditEvent[]> {
  const events = await runWithPlatformScope(() =>
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
  );

  const organizationIds = [...new Set(events.map((e) => e.organizationId).filter((id): id is string => !!id))];
  const organizations = await prisma.organization.findMany({
    where: { id: { in: organizationIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(organizations.map((o) => [o.id, o.name]));

  return events.map((event) => ({
    id: event.id,
    createdAt: event.createdAt,
    action: event.action,
    entity: event.entity,
    entityId: event.entityId,
    organizationId: event.organizationId,
    organizationName: event.organizationId ? (nameById.get(event.organizationId) ?? null) : null,
    metadata: event.metadata,
  }));
}
