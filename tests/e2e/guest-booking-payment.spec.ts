import { test, expect } from "@playwright/test";
import { getTenantUrl } from "@/lib/tenant-host";

/**
 * Caminho que gera dinheiro (ver docs/ROADMAP-2026-07-21.md Fase B): do
 * wizard público de reserva até o redirect pro Stripe Checkout (test
 * mode). Não completa o pagamento — só confirma que disponibilidade →
 * criação de booking → sessão de checkout não quebram. Tenant seedado em
 * tests/e2e/global-setup.ts (slug fixo "e2e-test", serviço de
 * pré-pagamento integral).
 *
 * Sprint 8 (hardening) — achado da Sprint 0: `page.goto("/")` resolvia
 * contra `baseURL` (playwright.config.ts), que é o domínio RAIZ de
 * marketing (lvh.me), não o subdomínio do tenant seedado
 * (e2e-test.lvh.me) — o wizard de reserva nunca existiu na página que o
 * teste carregava, só timeout esperando o botão "Book" que nunca
 * aparecia. getTenantUrl (mesma função que o resto do app usa pra
 * construir link de tenant, lib/tenant-host.ts) navega direto pro host
 * certo, sem depender de baseURL.
 *
 * Release Candidate gate — achado: escolher o dia de HOJE fica flaky nos
 * últimos ~60-75min antes da meia-noite local do tenant (minLeadTimeMinutes
 * padrão = 60min, lib/rules/schemas/v1.ts) — todo horário restante de hoje
 * cai dentro da janela de antecedência mínima e a lista de slots vem
 * vazia, não porque o app esteja errado (é o comportamento CORRETO desde
 * a Sprint 8), mas porque o teste presumia que "hoje" sempre tem slot.
 * Reproduzido rodando às 23:22 local. Escolher um dia alguns dias à
 * frente (bem longe da borda de antecedência mínima, bem dentro de
 * maxAdvanceDays=60) remove a dependência do horário em que o teste roda.
 */
test("reserva de convidado com pré-pagamento redireciona pro Stripe Checkout", async ({ page }) => {
  await page.goto(getTenantUrl("e2e-test", "/"));

  await page.getByRole("button", { name: "Book" }).click();

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);
  const targetDateLabel = targetDate.toLocaleDateString();
  const dayLocator = page.locator(`[data-day="${targetDateLabel}"]`);
  if (!(await dayLocator.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Go to the Next Month" }).click();
  }
  await dayLocator.click();

  const firstSlot = page.getByTestId("availability-slot").first();
  await expect(firstSlot).toBeVisible({ timeout: 15_000 });
  await firstSlot.click();

  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Name").fill("Playwright E2E");
  await page.getByLabel("Email").fill("playwright-e2e@example.com");

  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 }),
    page.getByRole("button", { name: "Confirm booking" }).click(),
  ]);

  expect(page.url()).toContain("checkout.stripe.com");
});
