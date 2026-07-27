import path from "node:path";
import { test as setup } from "@playwright/test";

const STAFF_AUTH_FILE = path.join(__dirname, "../.auth/staff.json");

/**
 * Não roda sozinho nem antes de outros testes — é acionado só via
 * `npm run test:e2e:login:staff` quando a sessão salva expirar. Abre o
 * Chromium visível e pausa em page.pause() para você logar manualmente
 * (e-mail + senha da equipe); ao clicar "Resume" no Playwright Inspector,
 * a sessão é salva em playwright/.auth/staff.json (gitignored).
 */
setup("login manual — equipe", async ({ page }) => {
  await page.goto("/login");

  console.log("\n> Faça login manualmente na janela do navegador (e-mail + senha da equipe).");
  console.log("> Quando o dashboard carregar, clique em \"Resume\" no Playwright Inspector.\n");

  await page.pause();

  await page.context().storageState({ path: STAFF_AUTH_FILE });
  console.log(`Sessão da equipe salva em ${STAFF_AUTH_FILE}`);
});
