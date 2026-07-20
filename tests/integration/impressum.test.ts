import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { getImpressum, upsertImpressum } from "@/lib/services/impressum-service";
import { createLocation } from "@/lib/services/location-service";

/**
 * Cobre a peça de negócio testável isoladamente: CRUD do Impressum e a
 * condição de bloqueio consumida por app/t/[slug]/page.tsx (Location com
 * countryCode "DE" + ausência de TenantImpressum -> agendamento bloqueado).
 * O bloqueio em si (Server Component) não é testado aqui pela mesma razão
 * documentada em tests/integration/mfa-enforcement.test.ts.
 */

const orgCrud = { id: randomUUID(), slug: `impressum-crud-${randomUUID().slice(0, 8)}` };
const orgDeBlocked = { id: randomUUID(), slug: `impressum-de-blocked-${randomUUID().slice(0, 8)}` };
const orgDeConfigured = { id: randomUUID(), slug: `impressum-de-ok-${randomUUID().slice(0, 8)}` };
const orgNonDe = { id: randomUUID(), slug: `impressum-nonde-${randomUUID().slice(0, 8)}` };
const allOrgIds = [orgCrud.id, orgDeBlocked.id, orgDeConfigured.id, orgNonDe.id];

beforeAll(async () => {
  await prisma.organization.createMany({
    data: allOrgIds.map((id, i) => ({ id, name: `Org ${i}`, slug: [orgCrud, orgDeBlocked, orgDeConfigured, orgNonDe][i].slug })),
  });
  await prisma.location.create({
    data: { organizationId: orgDeBlocked.id, name: "Filial DE", addressLine1: "x", postalCode: "x", city: "x", countryCode: "DE" },
  });
  await prisma.location.create({
    data: { organizationId: orgDeConfigured.id, name: "Filial DE", addressLine1: "x", postalCode: "x", city: "x", countryCode: "DE" },
  });
  await runWithTenant(orgDeConfigured.id, () =>
    upsertImpressum({ legalName: "Barbearia DE OK GmbH", addressLine1: "Astraße 1", postalCode: "10115", city: "Berlin" }, "user-1"),
  );
  await prisma.location.create({
    data: { organizationId: orgNonDe.id, name: "Filial AT", addressLine1: "x", postalCode: "x", city: "x", countryCode: "AT" },
  });
});

afterAll(async () => {
  await prisma.tenantImpressum.deleteMany({ where: { organizationId: { in: allOrgIds } } });
  await prisma.location.deleteMany({ where: { organizationId: { in: allOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: allOrgIds } } });
  await prisma.$disconnect();
});

describe("upsertImpressum / getImpressum", () => {
  test("cria na primeira chamada, atualiza na segunda (mesma organizationId)", async () => {
    await runWithTenant(orgCrud.id, () =>
      upsertImpressum(
        { legalName: "Barbearia GmbH", addressLine1: "Astraße 1", postalCode: "10115", city: "Berlin" },
        "user-1",
      ),
    );
    const first = await runWithTenant(orgCrud.id, getImpressum);
    expect(first?.legalName).toBe("Barbearia GmbH");

    await runWithTenant(orgCrud.id, () =>
      upsertImpressum(
        { legalName: "Barbearia GmbH (renamed)", addressLine1: "Astraße 1", postalCode: "10115", city: "Berlin" },
        "user-1",
      ),
    );
    const updated = await runWithTenant(orgCrud.id, getImpressum);
    expect(updated?.legalName).toBe("Barbearia GmbH (renamed)");
    expect(updated?.id).toBe(first?.id);
  });

  test("getImpressum retorna null quando não configurado", async () => {
    expect(await runWithTenant(orgNonDe.id, getImpressum)).toBeNull();
  });
});

describe("condição de bloqueio (Location DE + sem Impressum)", () => {
  async function isBlocked(organizationId: string) {
    const hasGermanLocation = (await prisma.location.count({ where: { organizationId, countryCode: "DE" } })) > 0;
    const impressum = await runWithTenant(organizationId, getImpressum);
    return hasGermanLocation && !impressum;
  }

  test("org com filial DE sem Impressum -> bloqueado", async () => {
    expect(await isBlocked(orgDeBlocked.id)).toBe(true);
  });

  test("org com filial DE E Impressum configurado -> não bloqueado", async () => {
    expect(await isBlocked(orgDeConfigured.id)).toBe(false);
  });

  test("org sem filial DE -> nunca bloqueado, mesmo sem Impressum", async () => {
    expect(await isBlocked(orgNonDe.id)).toBe(false);
  });
});

/**
 * Mimica exatamente o que app/_actions/create-organization.ts faz agora
 * dentro do runWithTenant do onboarding: createLocation (com phone/
 * description, coletados no passo 2 do wizard) + upsertImpressum na mesma
 * passada — cobre a razão de existir dessa mudança: o dono nunca deveria
 * ver o bloqueio na primeira visita à própria página pública.
 */
describe("onboarding: location + Impressum na mesma passada (evita o bloqueio já na criação)", () => {
  test("org recém-onboardada (DE) com phone/description e Impressum não fica bloqueada", async () => {
    const org = { id: randomUUID(), slug: `onboard-${randomUUID().slice(0, 8)}` };
    await prisma.organization.create({ data: { id: org.id, name: "Nova Barbearia", slug: org.slug } });

    await runWithTenant(org.id, async () => {
      await createLocation({
        name: "Nova Barbearia", addressLine1: "Hauptstraße 1", postalCode: "10115", city: "Berlin",
        countryCode: "DE", phone: "+49 30 1234567", description: "Cortes modernos no coração de Berlim.",
      });
      await upsertImpressum(
        { legalName: "Nova Barbearia GmbH", addressLine1: "Hauptstraße 1", postalCode: "10115", city: "Berlin", country: "DE" },
        "owner-user-1",
      );
    });

    const hasGermanLocation = (await prisma.location.count({ where: { organizationId: org.id, countryCode: "DE" } })) > 0;
    const impressum = await runWithTenant(org.id, getImpressum);
    expect(hasGermanLocation && !impressum).toBe(false);

    const location = await prisma.location.findFirstOrThrow({ where: { organizationId: org.id } });
    expect(location.phone).toBe("+49 30 1234567");
    expect(location.description).toBe("Cortes modernos no coração de Berlim.");

    await prisma.tenantImpressum.deleteMany({ where: { organizationId: org.id } });
    await prisma.location.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
  });
});
