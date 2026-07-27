import { test, expect } from "@playwright/test";

/**
 * Cobre a feature de nomes de status editáveis (migração
 * case_status_labels): editar em /configuracoes/processos precisa refletir
 * na Pipeline. Reverte o valor original no final para o teste ser repetível
 * sem sujar o dado real.
 */
test.describe("Nomes de status de processos", () => {
  test("editar o nome de um status reflete na Pipeline", async ({ page }) => {
    await page.goto("/configuracoes/processos");
    await expect(
      page.getByRole("heading", { name: "Nomes de status de processos" }),
    ).toBeVisible();

    const ativoInput = page.locator("#label_ativo");
    const original = await ativoInput.inputValue();
    const novo = `${original} (e2e)`;

    await ativoInput.fill(novo);
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Salvo.")).toBeVisible();

    await page.goto("/processos?view=kanban");
    await expect(page.getByText(novo, { exact: true }).first()).toBeVisible();

    await page.goto("/configuracoes/processos");
    await page.locator("#label_ativo").fill(original);
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Salvo.")).toBeVisible();
  });
});
