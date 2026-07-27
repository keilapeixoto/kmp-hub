import { test, expect } from "@playwright/test";

/**
 * Smoke tests do portal do cliente — confirmam que a sessão salva
 * (playwright/.auth/portal.json) ainda é válida e as rotas não redirecionam
 * pra /portal/login. Se falhar com URL de login, a sessão expirou: rodar
 * `npm run test:e2e:login:portal` de novo.
 */
test.describe("Portal do cliente", () => {
  test("dashboard do portal carrega", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/portal$/);
  });

  test("documentos carrega o checklist", async ({ page }) => {
    await page.goto("/portal/documentos");
    await expect(page).toHaveURL(/\/portal\/documentos$/);
  });
});
