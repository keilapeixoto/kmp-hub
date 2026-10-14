import { test, expect } from "@playwright/test";

/**
 * Fluxo do formulário no portal. Precisa da sessão do portal salva
 * (npm run test:e2e:login:portal) e de E2E_FORM_CASE_ID = id de um processo
 * de teste do visto 600 desse cliente. Sem a variável, o teste é pulado.
 */
const caso = process.env.E2E_FORM_CASE_ID;

test.describe("Formulário no portal", () => {
  test.skip(!caso, "defina E2E_FORM_CASE_ID");

  test("Próximo avança mesmo com obrigatórios vazios", async ({ page }) => {
    await page.goto(`/portal/formulario?processo=${caso}&etapa=1`);
    await page.getByRole("button", { name: /Próximo/ }).click();
    await expect(page).toHaveURL(/etapa=2/);
  });

  test("Enviar com pendência mostra a lista e não envia", async ({ page }) => {
    await page.goto(`/portal/formulario?processo=${caso}&etapa=9`);
    await page.getByRole("button", { name: /Enviar formulário/ }).click();
    await expect(page.getByText(/Faltam \d+ campo\(s\) obrigatório\(s\)/)).toBeVisible();
    await expect(page.getByText(/Formulário enviado com sucesso/)).toHaveCount(0);
  });
});
