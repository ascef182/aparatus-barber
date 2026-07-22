import { test, expect } from "@playwright/test";

/**
 * Caminho que gera dinheiro (ver docs/ROADMAP-2026-07-21.md Fase B): do
 * wizard público de reserva até o redirect pro Stripe Checkout (test
 * mode). Não completa o pagamento — só confirma que disponibilidade →
 * criação de booking → sessão de checkout não quebram. Tenant seedado em
 * tests/e2e/global-setup.ts (slug fixo "e2e-test", serviço de
 * pré-pagamento integral).
 */
test("reserva de convidado com pré-pagamento redireciona pro Stripe Checkout", async ({ page }) => {
  await page.goto("/");

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
