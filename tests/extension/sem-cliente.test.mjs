import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const SCRIPT = readFileSync(new URL("../../browser-extension/visa-autofill.js", import.meta.url), "utf8");

test("sem cliente carregado, o aviso diz para carregar um cliente (não fica calado)", async (t) => {
  const dom = new JSDOM(`<body><progress class="wc-progressbar" value="3" max="20"></progress></body>`, { runScripts: "outside-only" });
  t.after(() => dom.window.close());
  dom.window.chrome = { storage: { local: { get: async () => ({}) } } };
  dom.window.eval(SCRIPT);
  await new Promise((r) => setTimeout(r, 200));
  const selo = dom.window.document.getElementById("kmp-hub-selo-visto");
  assert.ok(selo, "o aviso deveria aparecer");
  assert.match(selo.textContent, /nenhum cliente carregado/i);
});
