import { test, expect } from "@playwright/test";

test.describe("Navegação da equipe", () => {
  test("dashboard carrega após login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("KMP Hub")).toBeVisible();
  });

  test("sidebar navega para Processos", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Processos", exact: true }).click();
    await expect(page).toHaveURL(/\/processos$/);
    await expect(page.getByRole("heading", { name: "Processos" })).toBeVisible();
  });

  test("sidebar navega para Configurações", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Configurações", exact: true }).click();
    await expect(page).toHaveURL(/\/configuracoes$/);
    await expect(
      page.getByRole("heading", { name: "Configurações" }),
    ).toBeVisible();
  });
});
