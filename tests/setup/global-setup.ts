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
}

export async function teardown() {
  await container?.stop();
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
