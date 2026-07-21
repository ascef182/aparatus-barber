import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithPlatformScope, runWithTenant } from "@/lib/tenant-context";
import { getResolvedRules, saveRules } from "@/lib/services/settings-service";
import { defaultRules, parseSettings } from "@/lib/rules/schemas";

const org = { id: randomUUID(), slug: `rules-${randomUUID().slice(0, 8)}` };
let locationId: string;
let staffId: string;

beforeAll(async () => {
  await prisma.organization.create({ data: { id: org.id, name: "Rules Org", slug: org.slug } });
  await runWithPlatformScope(async () => {
    const location = await db.location.create({
      data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
    });
    locationId = location.id;
    const staff = await db.staff.create({
      data: { organizationId: org.id, locationId, displayName: "Ana" },
    });
    staffId = staff.id;
  });
});

afterAll(async () => {
  // tenantSettings é append-only por design (UPDATE/DELETE revogados de
  // app_runtime na migração de RLS, mesma semântica de auditLog) -- as
  // linhas somem com o container efêmero do Testcontainers.
  await runWithPlatformScope(async () => {
    await db.staff.deleteMany({ where: { organizationId: org.id } });
    await db.location.deleteMany({ where: { organizationId: org.id } });
  });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("resolução de regras de negócio", () => {
  test("v1 resolvida corretamente com defaults quando não há settings salvos", async () => {
    const rules = await runWithTenant(org.id, () => getResolvedRules());
    expect(rules).toEqual(defaultRules());
  });

  test("herança: org -> location -> staff, mais específico sobrescreve", async () => {
    await runWithTenant(org.id, async () => {
      await saveRules({ ...defaultRules(), paymentMode: "DEPOSIT" }, "test:org");
      await saveRules(
        { ...defaultRules(), paymentMode: "FULL_PREPAYMENT" },
        "test:location",
        { scope: "LOCATION", scopeId: locationId },
      );
      await saveRules(
        { ...defaultRules(), paymentMode: "ON_SITE" },
        "test:staff",
        { scope: "STAFF", scopeId: staffId },
      );
    });

    const orgLevel = await runWithTenant(org.id, () => getResolvedRules());
    expect(orgLevel.paymentMode).toBe("DEPOSIT");

    const locationLevel = await runWithTenant(org.id, () => getResolvedRules({ locationId }));
    expect(locationLevel.paymentMode).toBe("FULL_PREPAYMENT");

    const staffLevel = await runWithTenant(org.id, () =>
      getResolvedRules({ locationId, staffId }),
    );
    expect(staffLevel.paymentMode).toBe("ON_SITE");

    // Location sem override próprio cai para o nível da organização.
    const otherLocationId = randomUUID();
    const fallback = await runWithTenant(org.id, () =>
      getResolvedRules({ locationId: otherLocationId }),
    );
    expect(fallback.paymentMode).toBe("DEPOSIT");
  });

  test("migração de shape: v1 com dados parciais preenche defaults", () => {
    const resolved = parseSettings(1, { paymentMode: "DEPOSIT" });
    expect(resolved.paymentMode).toBe("DEPOSIT");
    expect(resolved.slotGranularityMinutes).toBe(15);
    expect(resolved.cancellation.freeUntilHoursBefore).toBe(24);
  });

  test("versão de settings desconhecida falha de forma limpa (não quebra tenant)", () => {
    expect(() => parseSettings(2, {})).toThrow("Versão de settings desconhecida");
  });
});
