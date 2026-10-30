import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/tenant-context";
import { getMembership } from "@/lib/services/member-service";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { MissingTenantContextError } from "@/lib/tenant-context";

/**
 * Checklist explícito da Sprint 2 (programa de hardening, Seção 13 —
 * "TENANT SECURITY TESTS"). Cada teste abaixo referencia onde a garantia
 * já é coberta em outro arquivo, ou implementa a cobertura que faltava.
 * Ver docs/RELEASE_READINESS.md / relatório da Sprint 2 para o mapeamento
 * completo.
 *
 * 1. Tenant A não acessa Tenant B            -> tests/tenant-isolation.test.ts (exaustivo, todo TENANT_MODEL)
 * 2. Sessão de A em hostname B -> denied      -> ESTE ARQUIVO (não existia cobertura antes da Sprint 2)
 * 3. organizationId=B injetado no contexto A  -> tests/tenant-isolation.test.ts ("create com organizationId de outro tenant é bloqueado")
 * 4. Tenant context ausente -> fail closed    -> tests/tenant-isolation.test.ts ("fail-closed sem contexto", todo model) + tests/rls-policy.test.ts
 * 5. Cross-tenant FK -> database rejeita      -> tests/tenant-isolation.test.ts ("FK composta rejeita vínculo com recurso de outro tenant") + tests/rls-policy.test.ts (WITH CHECK)
 * 6. Raw Prisma não contorna o isolamento     -> tests/rls-policy.test.ts ("RLS no Postgres — enforcement direto via app_runtime, sem lib/db.ts")
 */

const orgA = { id: randomUUID(), slug: `tsm-a-${randomUUID().slice(0, 8)}` };
const orgB = { id: randomUUID(), slug: `tsm-b-${randomUUID().slice(0, 8)}` };
const userAId = randomUUID();

beforeAll(async () => {
  await prisma.organization.createMany({
    data: [
      { id: orgA.id, name: "Tenant A", slug: orgA.slug },
      { id: orgB.id, name: "Tenant B", slug: orgB.slug },
    ],
  });
  await prisma.user.create({
    data: { id: userAId, name: "User A", email: `usera-${userAId}@example.com` },
  });
  // User A é membro SOMENTE do tenant A — nunca de B.
  await prisma.member.create({
    data: { id: randomUUID(), organizationId: orgA.id, userId: userAId, role: "owner" },
  });
});

afterAll(async () => {
  await prisma.member.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
  await prisma.user.deleteMany({ where: { id: userAId } });
  await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  await prisma.$disconnect();
});

describe("Teste 2 — sessão válida de um tenant, request no hostname de outro (session fixation cross-subdomain)", () => {
  /**
   * Reproduz exatamente a composição que tenantActionClient (lib/safe-action.ts)
   * usa pra decidir acesso: organização resolvida do HOST da request (nunca
   * de input do cliente), depois getMembership(organização-do-host, userId-da-sessão).
   * Um atacante com a sessão de User A (válida, cookie cross-subdomain do
   * Better Auth) apontando a request pro hostname de B não deve ganhar
   * acesso a B só porque a sessão em si é válida em algum tenant.
   */
  test("usuário autenticado em A, request resolvida pro host de B: sem membership em B -> acesso negado", async () => {
    const organizationFromHostB = await getOrganizationBySlug(orgB.slug);
    expect(organizationFromHostB).not.toBeNull();

    const membershipInB = await getMembership(organizationFromHostB!.id, userAId);
    expect(membershipInB).toBeNull(); // exatamente a checagem que tenantActionClient faz e usa pra lançar ActionError
  });

  test("controle: o mesmo usuário TEM membership no seu próprio tenant (A)", async () => {
    const organizationFromHostA = await getOrganizationBySlug(orgA.slug);
    const membershipInA = await getMembership(organizationFromHostA!.id, userAId);
    expect(membershipInA).not.toBeNull();
    expect(membershipInA?.role).toBe("owner");
  });
});

describe("Teste 4 (reforço) — tenant context ausente falha fechado mesmo pra uma query trivial de leitura", () => {
  test("db.customer.findMany sem runWithTenant/runWithPlatformScope lança, nunca retorna []", async () => {
    // Sem runWithTenant envolvendo a chamada: getTenantContext() é
    // undefined. O comportamento fail-closed correto é LANÇAR, nunca
    // silenciosamente devolver uma lista vazia (que pareceria "não achei
    // nada" em vez de "faltou contexto de segurança").
    await expect(db.customer.findMany()).rejects.toThrow(MissingTenantContextError);
  });
});

describe("Teste 1 (smoke adicional) — dado real de A não aparece numa query de B na mesma suíte", () => {
  test("Customer criado sob A não é visível via runWithTenant(B)", async () => {
    const customer = await runWithTenant(orgA.id, () =>
      db.customer.create({ data: { organizationId: orgA.id, name: "Cliente de A" } }),
    );
    const seenFromB = await runWithTenant(orgB.id, () =>
      db.customer.findUnique({ where: { id: customer.id } }),
    );
    expect(seenFromB).toBeNull();
    await runWithTenant(orgA.id, () => db.customer.delete({ where: { id: customer.id } }));
  });
});
