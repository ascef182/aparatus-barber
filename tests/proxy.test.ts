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
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "aparatus.app");
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
    const response = proxy(request("/dashboard", "barbearia-x.aparatus.app"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  test("/dashboard/settings sob subdomínio de tenant também não é reescrito", () => {
    const response = proxy(request("/dashboard/settings", "barbearia-x.aparatus.app"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  test("rota pública do tenant (booking wizard) É reescrita para /t/{slug}", () => {
    const response = proxy(request("/", "barbearia-x.aparatus.app"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://barbearia-x.aparatus.app/t/barbearia-x");
  });

  test("x-pathname é propagado para o request reescrito", () => {
    const response = proxy(request("/", "barbearia-x.aparatus.app"));
    expect(response.headers.get("x-middleware-request-x-pathname")).toBe("/");
  });

  test("domínio raiz: /t/* é bloqueado", () => {
    const response = proxy(request("/t/whatever", "aparatus.app"));
    expect(response.status).toBe(307);
  });

  // /superadmin só deve existir no domínio raiz. Em host de tenant ele É
  // reescrito para /t/{slug}/superadmin — rota inexistente, 404 natural.
  // Se alguém adicionar /superadmin a RESERVED_PREFIXES no futuro, isso o
  // exporia nos subdomínios de tenant; este teste trava esse comportamento.
  test("/superadmin sob subdomínio de tenant é reescrito (vira 404 natural)", () => {
    const response = proxy(request("/superadmin", "barbearia-x.aparatus.app"));
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://barbearia-x.aparatus.app/t/barbearia-x/superadmin",
    );
  });

  test("/superadmin no domínio raiz passa sem rewrite", () => {
    const response = proxy(request("/superadmin", "aparatus.app"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.status).toBe(200);
  });
});
