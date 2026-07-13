import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global-setup.ts"],
    // Testcontainers: primeiro run baixa a imagem do Postgres
    hookTimeout: 120_000,
    testTimeout: 30_000,
    pool: "forks",
  },
});
