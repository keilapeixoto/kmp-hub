import { defineConfig, devices } from "@playwright/test";

/**
 * Login (staff senha, portal magic link) é feito manualmente por quem roda os
 * testes — ver playwright/setup/README.md. Os projetos "staff"/"portal" só
 * reusam o storageState já salvo; não geram sessão nova sozinhos.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testDir: "./playwright/setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "staff",
      testDir: "./tests/e2e/staff",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/staff.json",
      },
    },
    {
      name: "portal",
      testDir: "./tests/e2e/portal",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/portal.json",
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
