import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import proxy from "@/proxy";

/**
 * app/dashboard/ é tenant-scoped mas vive fora de app/t/[slug]/ — sem a
 * exceção RESERVED_PREFIXES em proxy.ts, {slug}.{root}/dashboard era
 * reescrito para /t/{slug}/dashboard (rota inexistente, 404 na aplicação
 * autenticada inteira). Regressão coberta aqui.
 */
describe("proxy — rewrite por subdomínio", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "bladiq.com");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  function request(pathname: string, host: string) {
    return new NextRequest(new URL(`http://${host}${pathname}`), {
      headers: { host },
    });
  }

  test("/dashboard sob subdomínio de tenant NÃO é reescrito para /t/{slug}", () => {
    const response = proxy(request("/dashboard", "barbearia-x.bladiq.com"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  test("/dashboard/settings sob subdomínio de tenant também não é reescrito", () => {
    const response = proxy(request("/dashboard/settings", "barbearia-x.bladiq.com"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  test("rota pública do tenant (booking wizard) É reescrita para /t/{slug}", () => {
    const response = proxy(request("/", "barbearia-x.bladiq.com"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://barbearia-x.bladiq.com/t/barbearia-x");
  });

  test("x-pathname é propagado para o request reescrito", () => {
    const response = proxy(request("/", "barbearia-x.bladiq.com"));
    expect(response.headers.get("x-middleware-request-x-pathname")).toBe("/");
  });

  test("domínio raiz: /t/* é bloqueado", () => {
    const response = proxy(request("/t/whatever", "bladiq.com"));
    expect(response.status).toBe(307);
  });

  // /superadmin só deve existir no domínio raiz. Em host de tenant ele É
  // reescrito para /t/{slug}/superadmin — rota inexistente, 404 natural.
  // Se alguém adicionar /superadmin a RESERVED_PREFIXES no futuro, isso o
  // exporia nos subdomínios de tenant; este teste trava esse comportamento.
  test("/superadmin sob subdomínio de tenant é reescrito (vira 404 natural)", () => {
    const response = proxy(request("/superadmin", "barbearia-x.bladiq.com"));
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://barbearia-x.bladiq.com/t/barbearia-x/superadmin",
    );
  });

  test("/superadmin no domínio raiz passa sem rewrite", () => {
    const response = proxy(request("/superadmin", "bladiq.com"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.status).toBe(200);
  });

  test("app.bladiq.com raiz é reescrito para /app (diretório de descoberta)", () => {
    const response = proxy(request("/", "app.bladiq.com"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://app.bladiq.com/app");
  });

  test("app.bladiq.com/algo é reescrito para /app/algo", () => {
    const response = proxy(request("/algo", "app.bladiq.com"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://app.bladiq.com/app/algo");
  });

  test("app.bladiq.com nunca resolve como slug de tenant", () => {
    const response = proxy(request("/dashboard", "app.bladiq.com"));
    // "app" está em RESERVED_SUBDOMAINS — nunca cai no ramo de tenant, então
    // /dashboard aqui NÃO é o RESERVED_PREFIXES do dashboard de staff, é só
    // um path qualquer dentro do rewrite pra /app.
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://app.bladiq.com/app/dashboard");
  });
});
