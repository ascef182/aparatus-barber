import { defineConfig, devices } from "@playwright/test";

/**
 * E2E deliberadamente pequeno (ver docs/ROADMAP-2026-07-21.md Fase B): só
 * o caminho que gera dinheiro (reserva com pagamento online até o
 * redirect pro Stripe Checkout), não uma suite completa. Sobe o próprio
 * dev server contra o Postgres/Redis locais (docker compose up -d) — não
 * roda em CI hoje, é verificação manual antes de deploy.
 */
const PORT = process.env.PORT ?? "3000";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://lvh.me:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
