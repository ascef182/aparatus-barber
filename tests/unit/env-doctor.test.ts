import { describe, expect, test } from "vitest";
import { inspectEnv } from "@/scripts/env-doctor";

const validBase = `
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aparatus"
RUNTIME_DATABASE_URL="postgresql://app_runtime:password@localhost:5432/aparatus"
REDIS_URL="redis://localhost:6379"
TRUSTED_PROXY_IP_HEADER="x-real-ip"
HEALTHCHECK_SECRET="12345678901234567890123456789012"
CONSENT_IP_HASH_SECRET="abcdefghijklmnopqrstuvxyz1234567"
BETTER_AUTH_SECRET="abcdefghijklmnopqrstuvwxyz123456"
BETTER_AUTH_URL="http://lvh.me:3000"
NEXT_PUBLIC_APP_URL="http://lvh.me:3000"
NEXT_PUBLIC_ROOT_DOMAIN="lvh.me:3000"
`;

describe("env doctor", () => {
  test("accepts a minimal local environment without exposing values", () => {
    expect(inspectEnv(validBase).errors).toEqual([]);
  });

  test("reports duplicate variables and predictable secrets by name", () => {
    const result = inspectEnv(
      `${validBase}\nREDIS_URL="rediss://remote.example:6379"\nBETTER_AUTH_SECRET="secret"`,
    );

    expect(result.errors).toContain("REDIS_URL: definido 2 vezes");
    expect(result.errors).toContain("BETTER_AUTH_SECRET: definido 2 vezes");
    expect(result.errors).toContain(
      "BETTER_AUTH_SECRET: deve ter pelo menos 32 caracteres",
    );
    expect(result.errors).toContain(
      "BETTER_AUTH_SECRET: ainda contém um placeholder previsível",
    );
    expect(result.errors.join(" ")).not.toContain("rediss://remote.example");
  });

  test("warns about obsolete integrations", () => {
    const result = inspectEnv(`${validBase}\nOPENAI_API_KEY="unused"`);
    expect(result.warnings).toContain(
      "OPENAI_API_KEY: não é usado pelo código atual",
    );
  });
});
