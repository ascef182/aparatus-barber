import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getTenantUrl } from "@/lib/tenant-host";

/**
 * Seção 36 do programa de hardening — BLOCKER absoluto: Tenant A nunca
 * pode ver dado de Tenant B. Self-contained (beforeAll/afterAll próprios,
 * não usa tests/e2e/global-setup.ts, que é específico do fixture de
 * pagamento) — dois tenants reais, dois owners reais, sessão de
 * navegador de verdade (login pelo form, não cookie injetado), cruzando
 * hosts de verdade (subdomínios distintos), do jeito que um ataque real
 * aconteceria.
 */

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type TenantFixture = { slug: string; orgId: string; email: string; password: string; customerName: string };

const PASSWORD = "e2e-isolation-password-1";
const tenantA: TenantFixture = { slug: `iso-a-${randomUUID().slice(0, 6)}`, orgId: randomUUID(), email: `owner-a-${randomUUID().slice(0, 6)}@example.com`, password: PASSWORD, customerName: "Cliente Confidencial A" };
const tenantB: TenantFixture = { slug: `iso-b-${randomUUID().slice(0, 6)}`, orgId: randomUUID(), email: `owner-b-${randomUUID().slice(0, 6)}@example.com`, password: PASSWORD, customerName: "Cliente Confidencial B" };

async function seedTenant(t: TenantFixture) {
  await prisma.organization.create({ data: { id: t.orgId, name: `Isolation Org ${t.slug}`, slug: t.slug, timezone: "America/Sao_Paulo" } });
  await prisma.customer.create({ data: { organizationId: t.orgId, name: t.customerName, email: `${t.slug}-customer@example.com` } });
}

test.beforeAll(async () => {
  await seedTenant(tenantA);
  await seedTenant(tenantB);
});

test.afterAll(async () => {
  for (const t of [tenantA, tenantB]) {
    await prisma.customer.deleteMany({ where: { organizationId: t.orgId } });
    await prisma.member.deleteMany({ where: { organizationId: t.orgId } });
  }
  const users = await prisma.user.findMany({ where: { email: { in: [tenantA.email, tenantB.email] } } });
  await prisma.session.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.account.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  await prisma.organization.deleteMany({ where: { id: { in: [tenantA.orgId, tenantB.orgId] } } });
  await prisma.$disconnect();
});

async function createOwnerAndSignIn(page: Page, t: TenantFixture) {
  // Cadastro direto no host do tenant (mesmo fluxo que um convite futuro
  // usaria) é mais simples que passar pelo wizard de onboarding completo
  // pra este teste — o que importa aqui é a sessão real de navegador, não
  // o fluxo de criação de conta em si.
  await page.goto(getTenantUrl(t.slug, "/sign-up"));
  await page.getByLabel("Name").fill("Owner Isolation");
  await page.getByLabel("Email").fill(t.email);
  await page.getByLabel("Password", { exact: true }).fill(t.password);
  await page.getByRole("button", { name: "Create account" }).click();
  // signUpForm.onSubmit faz window.location.assign("/onboarding") só
  // depois do round-trip de authClient.signUp.email resolver — esperar
  // um timeout fixo é flaky (o form pode não ter respondido ainda);
  // espera a navegação de verdade, sinal determinístico de que o signup
  // realmente completou e a sessão existe.
  await page.waitForURL(/\/onboarding/, { timeout: 15_000 });
}

test.describe("Isolamento entre tenants — sessão de A nunca alcança dado de B", () => {
  test("owner autenticado no tenant A não acessa o dashboard nem os dados de B trocando o host", async ({ page, context }) => {
    // 1) Cria e loga como owner de A pelo formulário de verdade.
    await createOwnerAndSignIn(page, tenantA);

    // Membership não é criada pelo signup público sozinho (organização já
    // existe, seedada via Prisma acima) — grava direto, é o mesmo atalho
    // administrativo que scripts/make-superadmin.ts usa, não abre brecha
    // nenhuma: só decide o que o teste testa, a checagem de acesso real
    // continua sendo tenantActionClient/dashboard-context-service.
    const user = await prisma.user.findUniqueOrThrow({ where: { email: tenantA.email } });
    await prisma.member.create({ data: { id: randomUUID(), organizationId: tenantA.orgId, userId: user.id, role: "owner" } });

    // 2) Confirma acesso NORMAL ao próprio tenant primeiro (controle).
    await page.goto(getTenantUrl(tenantA.slug, "/dashboard/customers"));
    await expect(page.getByText(tenantA.customerName)).toBeVisible({ timeout: 10_000 });

    // 3) Com a MESMA sessão (cookie cross-subdomain do Better Auth,
    // válido em *.{root}), tenta acessar o dashboard de B só trocando o
    // host na URL — exatamente o ataque que tenantActionClient's
    // "session fixation prevention" (lib/safe-action.ts) existe pra
    // barrar. Sem membership em B, deve negar - nunca mostrar dado de B.
    await page.goto(getTenantUrl(tenantB.slug, "/dashboard/customers"));
    await expect(page.getByText(tenantB.customerName)).not.toBeVisible();
    await expect(page.getByText(tenantA.customerName)).not.toBeVisible();

    // Confirma que foi de fato negado/redirecionado, não só "carregou em
    // branco por acaso" — a URL final não pode ser o dashboard de B com
    // sucesso (ver app/(protected)/dashboard/layout.tsx: redirect("/")
    // quando getDashboardContext retorna null por falta de membership).
    await expect(page).not.toHaveURL(/\/dashboard\/customers$/);

    await context.close();
  });
});
