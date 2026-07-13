import { beforeAll, afterAll, describe, expect, test, vi } from "vitest";
import { resolveTenantSlug } from "@/lib/tenant-host";

describe("resolveTenantSlug", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "aparatus.app");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  test("subdomínio de tenant resolve para slug", () => {
    expect(resolveTenantSlug("barbearia-x.aparatus.app")).toBe("barbearia-x");
  });

  test("domínio raiz e www não são tenant", () => {
    expect(resolveTenantSlug("aparatus.app")).toBeNull();
    expect(resolveTenantSlug("www.aparatus.app")).toBeNull();
  });

  test("host de outra zona não é tenant", () => {
    expect(resolveTenantSlug("evil.com")).toBeNull();
    expect(resolveTenantSlug("aparatus.app.evil.com")).toBeNull();
  });

  test("subdomínio aninhado é rejeitado", () => {
    expect(resolveTenantSlug("a.b.aparatus.app")).toBeNull();
  });

  test("host null e case-insensitive", () => {
    expect(resolveTenantSlug(null)).toBeNull();
    expect(resolveTenantSlug("Barber-X.Aparatus.APP")).toBe("barber-x");
  });
});
