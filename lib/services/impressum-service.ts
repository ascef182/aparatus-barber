import { db } from "@/lib/db";
import { requireTenantId } from "@/lib/tenant-context";

type ImpressumClient = Pick<typeof db, "tenantImpressum">;

export type ImpressumInput = {
  legalName: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country?: string;
  representedBy?: string;
  phone?: string;
  email?: string;
  registerCourt?: string;
  registerNumber?: string;
  vatId?: string;
};

export function getImpressum() {
  return db.tenantImpressum.findUnique({ where: { organizationId: requireTenantId() } });
}

export function upsertImpressum(
  data: ImpressumInput,
  updatedBy: string,
  client: ImpressumClient = db,
) {
  const organizationId = requireTenantId();
  return client.tenantImpressum.upsert({
    where: { organizationId },
    create: { ...data, organizationId, updatedBy },
    update: { ...data, updatedBy },
  });
}
