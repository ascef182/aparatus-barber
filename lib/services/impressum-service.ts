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

/** `client` aceita um `tx` do Prisma pra rodar dentro de uma transação
 * maior (ex.: onboarding, que grava Impressum + outros registros juntos);
 * default `db` cobre o caso comum de update isolado. */
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
