import { db } from "@/lib/db";
import { requireTenantId } from "@/lib/tenant-context";

// Location é tenant-scoped: sempre via `db` (extension injeta/valida
// organizationId). O requireTenantId torna o create type-safe e a extension
// confere a igualdade — dupla checagem intencional.

export function listLocations() {
  return db.location.findMany({ orderBy: { createdAt: "asc" } });
}

export function getLocationById(id: string) {
  return db.location.findUnique({ where: { id } });
}

export function createLocation(data: {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  countryCode?: string;
  phone?: string;
}) {
  return db.location.create({
    data: { ...data, organizationId: requireTenantId() },
  });
}
