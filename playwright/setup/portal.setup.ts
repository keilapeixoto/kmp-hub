import path from "node:path";
import { test as setup } from "@playwright/test";

const PORTAL_AUTH_FILE = path.join(__dirname, "../.auth/portal.json");

/**
 * Não roda sozinho nem antes de outros testes — é acionado só via
 * `npm run test:e2e:login:portal` quando a sessão salva expirar. O login do
 * portal é por magic link (sem senha): envie o link no formulário, abra o
 * e-mail e cole a URL do link NESTA janela do Chromium controlada pelo
 * Playwright (não no seu navegador comum) — clicar o link no seu navegador
 * normal não autentica esta sessão. Depois de ver o dashboard do portal,
 * clique "Resume" no Playwright Inspector.
 */
setup("login manual — portal do cliente", async ({ page }) => {
  await page.goto("/portal/login");

  console.log("\n> Envie o link mágico, abra o e-mail e cole a URL do link NESTA janela.");
  console.log("> Quando o dashboard do portal carregar, clique em \"Resume\" no Playwright Inspector.\n");

  await page.pause();

  await page.context().storageState({ path: PORTAL_AUTH_FILE });
  console.log(`Sessão do portal salva em ${PORTAL_AUTH_FILE}`);
});
