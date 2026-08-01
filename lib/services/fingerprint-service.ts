import { db } from "@/lib/db";

// DeviceFingerprint é escopo de plataforma (fora de TENANT_MODELS): a
// checagem de fraude precisa correlacionar o mesmo visitorId através de
// várias organizations, não só a atual.
type DeviceFingerprintClient = Pick<typeof db, "deviceFingerprint">;

export type FingerprintContext = "SIGNUP" | "SUBSCRIPTION_CHECKOUT";

export async function recordDeviceFingerprint(
  input: {
    organizationId?: string;
    visitorId: string;
    context: FingerprintContext;
    ipHash?: string;
    userAgent?: string;
  },
  client: DeviceFingerprintClient = db,
) {
  return client.deviceFingerprint.create({ data: input });
}

/**
 * Quantas organizations distintas (além de `excludeOrganizationId`) já
 * gravaram esse visitorId — sinal de reuso do mesmo dispositivo entre
 * trials/contas diferentes.
 */
export async function countOtherOrganizationsForVisitor(
  visitorId: string,
  excludeOrganizationId?: string,
  client: DeviceFingerprintClient = db,
): Promise<number> {
  const rows = await client.deviceFingerprint.findMany({
    where: {
      visitorId,
      organizationId: { not: null },
      ...(excludeOrganizationId
        ? { NOT: { organizationId: excludeOrganizationId } }
        : {}),
    },
    distinct: ["organizationId"],
    select: { organizationId: true },
  });
  return rows.length;
}
