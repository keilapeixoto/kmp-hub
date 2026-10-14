import test from "node:test";
import assert from "node:assert/strict";
import { buildSubmittedEmail, avisarEnvio } from "../../lib/case-forms/notify.ts";

test("nome com HTML é escapado no corpo do e-mail", () => {
  const { html, subject } = buildSubmittedEmail({
    clienteNome: '<script>alert("x")</script>\nBcc: a@b.c',
    link: "https://site/processos/1",
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!/[\r\n]/.test(subject));
});

const base = { siteUrl: "https://site" };

test("envia para a consultora do processo com o link", async () => {
  let enviado;
  await avisarEnvio(
    {
      ...base,
      buscarDestino: async () => ({ email: "k@x.com", clienteNome: "Maria" }),
      enviar: async (to, s, h) => ((enviado = { to, s, h }), { ok: true, error: null }),
    },
    "caso-1",
  );
  assert.deepEqual(enviado.to, ["k@x.com"]);
  assert.ok(enviado.h.includes("https://site/processos/caso-1"));
});

test("falha do Resend não derruba o envio do formulário", async () => {
  const dest = async () => ({ email: "k@x.com", clienteNome: "M" });
  await avisarEnvio({ ...base, buscarDestino: dest, enviar: async () => ({ ok: false, error: "sem chave" }) }, "c");
  await avisarEnvio({ ...base, buscarDestino: dest, enviar: async () => { throw new Error("rede"); } }, "c");
  await avisarEnvio({ ...base, buscarDestino: async () => { throw new Error("banco"); }, enviar: async () => ({ ok: true, error: null }) }, "c");
});

test("sem e-mail da consultora: não envia nada", async () => {
  let chamou = false;
  await avisarEnvio(
    {
      ...base,
      buscarDestino: async () => ({ email: null, clienteNome: "M" }),
      enviar: async () => ((chamou = true), { ok: true, error: null }),
    },
    "c",
  );
  assert.equal(chamou, false);
});
