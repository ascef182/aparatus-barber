import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

let container: StartedPostgreSqlContainer;

export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();

  const databaseUrl = container.getConnectionUri();

  execSync("pnpm exec prisma migrate deploy", {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  project.provide("databaseUrl", databaseUrl);

  // A migração de RLS (20260720120000_add_rls_policies) cria a role
  // restrita app_runtime nesse mesmo container -- lib/prisma.ts agora lê
  // RUNTIME_DATABASE_URL para toda query em runtime, então os testes
  // precisam apontar para ela também.
  const appRuntimeUrl = new URL(databaseUrl);
  appRuntimeUrl.username = "app_runtime";
  appRuntimeUrl.password = "app_runtime_change_me";
  project.provide("appRuntimeDatabaseUrl", appRuntimeUrl.toString());
}

export async function teardown() {
  await container?.stop();
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
    appRuntimeDatabaseUrl: string;
  }
}
