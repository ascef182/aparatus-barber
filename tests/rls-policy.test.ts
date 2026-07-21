import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, inject, test } from "vitest";

/**
 * Prova que a política de RLS (prisma/migrations/20260720120000_add_rls_policies)
 * vale no Postgres em si, independente de lib/db.ts — conecta direto como a
 * role restrita app_runtime via `pg`, sem passar pelo client Prisma da app.
 * Ver plano de RLS, seção 4.7. Sibling de tests/tenant-isolation.test.ts
 * (que testa a extensão do Prisma), não misturado com ele.
 */

const orgA = randomUUID();
const orgB = randomUUID();
let locationA: string;
let locationB: string;

async function withClient<T>(
  connectionString: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

beforeAll(async () => {
  const ownerUrl = inject("databaseUrl");
  locationA = randomUUID();
  locationB = randomUUID();

  await withClient(ownerUrl, async (owner) => {
    await owner.query(
      `INSERT INTO organization (id, name, slug, "createdAt") VALUES ($1, 'RLS Org A', $2, now()), ($3, 'RLS Org B', $4, now())`,
      [orgA, `rls-a-${orgA.slice(0, 8)}`, orgB, `rls-b-${orgB.slice(0, 8)}`],
    );
    await owner.query(
      `INSERT INTO "location" (id, "organizationId", name, "addressLine1", "postalCode", city, "createdAt", "updatedAt")
       VALUES ($1, $2, 'Loc A', 'x', 'x', 'x', now(), now()), ($3, $4, 'Loc B', 'x', 'x', 'x', now(), now())`,
      [locationA, orgA, locationB, orgB],
    );
    // Uma linha de plataforma (organizationId NULL) e uma de tenant, para
    // testar a regra especial de auditLog.
    await owner.query(
      `INSERT INTO "auditLog" (id, "organizationId", entity, action) VALUES ($1, NULL, 'System', 'PLATFORM_EVENT'), ($2, $3, 'Booking', 'BOOKING_CREATED')`,
      [randomUUID(), randomUUID(), orgA],
    );
  });
});

afterAll(async () => {
  const ownerUrl = inject("databaseUrl");
  await withClient(ownerUrl, async (owner) => {
    await owner.query('DELETE FROM "auditLog" WHERE "organizationId" IN ($1, $2) OR "organizationId" IS NULL', [orgA, orgB]);
    await owner.query('DELETE FROM "location" WHERE id IN ($1, $2)', [locationA, locationB]);
    await owner.query("DELETE FROM organization WHERE id IN ($1, $2)", [orgA, orgB]);
  });
});

describe("RLS no Postgres — enforcement direto via app_runtime, sem lib/db.ts", () => {
  test("sem app.tenant_id setado, SELECT não vê nenhuma linha (fail-closed)", async () => {
    const runtimeUrl = inject("appRuntimeDatabaseUrl");
    const rows = await withClient(runtimeUrl, (client) =>
      client
        .query('SELECT id FROM "location" WHERE id IN ($1, $2)', [locationA, locationB])
        .then((r) => r.rows),
    );
    expect(rows).toHaveLength(0);
  });

  test("com app.tenant_id = org A, só vê a própria linha", async () => {
    const runtimeUrl = inject("appRuntimeDatabaseUrl");
    const rows = await withClient(runtimeUrl, async (client) => {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [orgA]);
      const result = await client.query('SELECT id, name FROM "location" WHERE id IN ($1, $2)', [
        locationA,
        locationB,
      ]);
      await client.query("ROLLBACK");
      return result.rows;
    });
    expect(rows).toEqual([{ id: locationA, name: "Loc A" }]);
  });

  test("INSERT cross-tenant sob contexto de org A é rejeitado pelo WITH CHECK", async () => {
    const runtimeUrl = inject("appRuntimeDatabaseUrl");
    await withClient(runtimeUrl, async (client) => {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [orgA]);
      await expect(
        client.query(
          `INSERT INTO "location" (id, "organizationId", name, "addressLine1", "postalCode", city, "createdAt", "updatedAt")
           VALUES ($1, $2, 'intruso', 'x', 'x', 'x', now(), now())`,
          [randomUUID(), orgB],
        ),
      ).rejects.toThrow(/row-level security/i);
      await client.query("ROLLBACK");
    });
  });

  test("com app.bypass_rls = 'on', vê linhas de ambos os tenants (escopo de plataforma)", async () => {
    const runtimeUrl = inject("appRuntimeDatabaseUrl");
    const rows = await withClient(runtimeUrl, async (client) => {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.bypass_rls', 'on', true)");
      const result = await client.query('SELECT id FROM "location" WHERE id IN ($1, $2)', [
        locationA,
        locationB,
      ]);
      await client.query("ROLLBACK");
      return result.rows;
    });
    expect(rows).toHaveLength(2);
  });

  test("auditLog: organizationId NULL fica invisível sob contexto de tenant, visível sob bypass", async () => {
    const runtimeUrl = inject("appRuntimeDatabaseUrl");

    const underTenant = await withClient(runtimeUrl, async (client) => {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [orgA]);
      const result = await client.query('SELECT "organizationId" FROM "auditLog"');
      await client.query("ROLLBACK");
      return result.rows;
    });
    expect(underTenant.every((row) => row.organizationId === orgA)).toBe(true);

    const underBypass = await withClient(runtimeUrl, async (client) => {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.bypass_rls', 'on', true)");
      const result = await client.query('SELECT "organizationId" FROM "auditLog"');
      await client.query("ROLLBACK");
      return result.rows;
    });
    expect(underBypass.some((row) => row.organizationId === null)).toBe(true);
  });
});
