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
 * certo, sem depender de baseURL — necessário de qualquer forma pra uma
 * jornada de owner que cruza hosts (marketing -> subdomínio recém-criado),
 * ver owner-onboarding.spec.ts.
 */
test("reserva de convidado com pré-pagamento redireciona pro Stripe Checkout", async ({ page }) => {
  await page.goto(getTenantUrl("e2e-test", "/"));

  await page.getByRole("button", { name: "Book" }).click();

  const today = new Date().toLocaleDateString();
  await page.locator(`[data-day="${today}"]`).click();

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
