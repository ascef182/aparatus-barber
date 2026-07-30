import { beforeAll, afterAll, describe, expect, test, vi } from "vitest";
import { getRootUrl, getTenantUrl, resolveTenantSlug } from "@/lib/tenant-host";

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

  test("subdomínios reservados não são tenant", () => {
    expect(resolveTenantSlug("app.bladiq.com")).toBeNull();
    expect(resolveTenantSlug("api.bladiq.com")).toBeNull();
    expect(resolveTenantSlug("admin.bladiq.com")).toBeNull();
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

/**
 * Regressão: create-booking-payment-checkout.ts e
 * create-subscription-checkout.ts usavam NEXT_PUBLIC_APP_URL (domínio raiz)
 * em vez de getTenantUrl no success_url/cancel_url do Stripe Checkout — o
 * cliente/dono pagava e caía na home de marketing em vez de voltar pro
 * subdomínio do tenant, nunca vendo a confirmação. getTenantUrl é a função
 * que corrige isso; estes testes travam o contrato pra não regredir.
 */
describe("getTenantUrl / getRootUrl", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "bladiq.com");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://bladiq.com");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  test("getTenantUrl aponta pro subdomínio do slug, não pro domínio raiz", () => {
    const url = getTenantUrl("barbearia-x", "/?booking=success");
    expect(url).toBe("https://barbearia-x.bladiq.com/?booking=success");
    expect(url).not.toContain("://bladiq.com");
  });

  test("getTenantUrl preserva query string e path de rotas do dashboard", () => {
    expect(getTenantUrl("barbearia-x", "/dashboard/billing?success=1")).toBe(
      "https://barbearia-x.bladiq.com/dashboard/billing?success=1",
    );
  });

  test("getRootUrl não inclui slug de tenant", () => {
    expect(getRootUrl("/sign-in")).toBe("https://bladiq.com/sign-in");
  });

  test("protocolo derivado de NEXT_PUBLIC_APP_URL (http em dev, https em produção)", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://lvh.me:3000");
    expect(getTenantUrl("barbearia-x")).toBe("http://barbearia-x.bladiq.com");
  });
});
