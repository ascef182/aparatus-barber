import { beforeAll, afterAll, describe, expect, test, vi } from "vitest";
import { resolveTenantSlug } from "@/lib/tenant-host";

describe("resolveTenantSlug", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "bladiq.com");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  test("subdomínio de tenant resolve para slug", () => {
    expect(resolveTenantSlug("barbearia-x.bladiq.com")).toBe("barbearia-x");
  });

  test("domínio raiz e www não são tenant", () => {
    expect(resolveTenantSlug("bladiq.com")).toBeNull();
    expect(resolveTenantSlug("www.bladiq.com")).toBeNull();
  });

  test("host de outra zona não é tenant", () => {
    expect(resolveTenantSlug("evil.com")).toBeNull();
    expect(resolveTenantSlug("bladiq.com.evil.com")).toBeNull();
  });

  test("subdomínio aninhado é rejeitado", () => {
    expect(resolveTenantSlug("a.b.bladiq.com")).toBeNull();
  });

  test("host null e case-insensitive", () => {
    expect(resolveTenantSlug(null)).toBeNull();
    expect(resolveTenantSlug("Barber-X.bladiq.com")).toBe("barber-x");
  });
});
