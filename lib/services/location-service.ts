import { db } from "@/lib/db";
import { requireTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { isPlanLimitReached } from "@/lib/billing/plan-limits";

// Location é tenant-scoped: sempre via `db` (extension injeta/valida
// organizationId). O requireTenantId torna o create type-safe e a extension
// confere a igualdade — dupla checagem intencional.

type LocationClient = Pick<typeof db, "location">;

export function listLocations() {
  return db.location.findMany({ orderBy: { createdAt: "asc" } });
}

export function getLocationById(id: string) {
  return db.location.findUnique({ where: { id } });
}

export async function createLocation(
  data: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    postalCode: string;
    city: string;
    countryCode?: string;
    phone?: string;
    description?: string;
  },
  client: LocationClient = db,
) {
  const organizationId = requireTenantId();
  const [organization, count] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    client.location.count(),
  ]);
  if (!organization || isPlanLimitReached(organization.subscriptionPlan, count, "locations")) {
    throw new Error("O limite de locais do seu plano foi atingido.");
  }
  return client.location.create({
    data: { ...data, organizationId },
  });
}
