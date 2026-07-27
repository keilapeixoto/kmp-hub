import { test, expect } from "@playwright/test";

/**
 * Depende de dados de demonstração já existirem (node scripts/seed-demo.mjs)
 * — precisa de ao menos 1 cliente e 1 tipo de serviço cadastrados para
 * popular os selects. Não cobre o drag-and-drop do Kanban (eventos HTML5
 * nativos de dataTransfer são frágeis de automatizar) — só criação via
 * formulário e status inicial.
 */
test.describe("Processos — criar", () => {
  test("criar processo pelo formulário", async ({ page }) => {
    await page.goto("/processos/novo");

    await page.getByLabel("Cliente *").selectOption({ index: 1 });
    await page.getByLabel("Tipo de serviço *").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page).toHaveURL(/\/processos\/[0-9a-f-]{36}$/);
  });
});
