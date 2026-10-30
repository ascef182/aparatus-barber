import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/services/dashboard-context-service.ts substitui a resolução
 * duplicada de session/organization/membership que layout.tsx e cada
 * dashboard/**\/page.tsx faziam independentemente (ver incidente de
 * produção: N+1 de Postgres/Redis numa única request de /dashboard).
 * Mocka as 3 dependências de I/O (sessão, org, membership) pra isolar a
 * composição + o comportamento de cache — resolveTenantSlug é puro e roda
 * de verdade.
 */

const getSessionMock = vi.fn();
const getOrganizationBySlugMock = vi.fn();
const getMembershipMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSessionMock(...args) } },
}));
vi.mock("@/lib/services/organization-service", () => ({
  getOrganizationBySlug: (...args: unknown[]) => getOrganizationBySlugMock(...args),
}));
vi.mock("@/lib/services/member-service", () => ({
  getMembership: (...args: unknown[]) => getMembershipMock(...args),
}));

const { getDashboardContext } = await import("@/lib/services/dashboard-context-service");

// Mesma convenção de tests/tenant-host.test.ts: NEXT_PUBLIC_ROOT_DOMAIN não
// vem do .env local neste ambiente de teste (só stub explícito), então
// fixamos o domínio raiz em vez de depender do que estiver configurado.
const ROOT_DOMAIN = "bladiq.com";
const TENANT_HOST = `test-tenant.${ROOT_DOMAIN}`;
const fakeUser = { id: randomUUID() };
const fakeSession = { user: fakeUser };
const fakeOrg = { id: randomUUID(), slug: "test-tenant" };
const fakeMembership = { id: randomUUID(), role: "owner" as const };

function makeHeaders(host: string = TENANT_HOST): Headers {
  return new Headers({ host });
}

beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", ROOT_DOMAIN);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();
  getSessionMock.mockResolvedValue(fakeSession);
  getOrganizationBySlugMock.mockResolvedValue(fakeOrg);
  getMembershipMock.mockResolvedValue(fakeMembership);
});

describe("getDashboardContext", () => {
  test("resolves session + organization + membership from the request host", async () => {
    const ctx = await getDashboardContext(makeHeaders());
    expect(ctx).toEqual({ session: fakeSession, organization: fakeOrg, membership: fakeMembership });
    expect(getOrganizationBySlugMock).toHaveBeenCalledWith("test-tenant");
    expect(getMembershipMock).toHaveBeenCalledWith(fakeOrg.id, fakeUser.id);
  });

  test("returns null when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);
    expect(await getDashboardContext(makeHeaders())).toBeNull();
    expect(getOrganizationBySlugMock).not.toHaveBeenCalled();
  });

  test("returns null when the host does not resolve to a tenant slug (root domain)", async () => {
    expect(await getDashboardContext(makeHeaders(ROOT_DOMAIN))).toBeNull();
    expect(getOrganizationBySlugMock).not.toHaveBeenCalled();
  });

  test("returns null when no organization matches the slug", async () => {
    getOrganizationBySlugMock.mockResolvedValue(null);
    expect(await getDashboardContext(makeHeaders())).toBeNull();
    expect(getMembershipMock).not.toHaveBeenCalled();
  });

  test("returns null when the user has no membership in the tenant", async () => {
    getMembershipMock.mockResolvedValue(null);
    expect(await getDashboardContext(makeHeaders())).toBeNull();
  });
});

/**
 * NOTA sobre cache() (Seção 10 do programa de hardening — "não confiar que
 * cache() resolve a duplicação sem prova"): tentamos aqui um teste
 * chamando getDashboardContext duas vezes com a MESMA instância de
 * Headers, esperando 1 execução do corpo. Ele falhava sempre — não por bug
 * nesta função, mas porque React.cache() só memoiza dentro do cache scope
 * de uma render real de Server Component; chamado direto (como qualquer
 * teste vitest faz), roda a cada chamada, sem scope nenhum pra memoizar
 * contra. Verificação real foi feita fora deste arquivo: dev server local
 * (`pnpm dev`), sessão autenticada de verdade, uma única request a
 * `/dashboard` (que aciona layout.tsx + dashboard/page.tsx, ambos
 * chamando esta função) com um log temporário no corpo — resultado: UMA
 * única execução por request, confirmando que cache() dedupe corretamente
 * no uso real. Documentado no relatório da Sprint 1. Regressão futura
 * deve ser pega por um teste E2E que meça queries por request real
 * (candidato: Sprint 8), não por um unit test desta função isolada — a
 * própria limitação acima é o motivo de não existir um aqui.
 */
