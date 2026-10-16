import test from "node:test";
import assert from "node:assert/strict";
import { montarAvisoAoCliente, dataDoPrazo } from "../../lib/portal/avisos-cliente.ts";

const link = "https://portal.exemplo/portal/documentos?processo=1";

test("dataDoPrazo: pt e en", () => {
  assert.equal(dataDoPrazo("2026-10-24", "pt"), "24/10/2026");
  assert.equal(dataDoPrazo("2026-10-04", "en"), "4 Oct 2026");
});

test("pedido: nome, prazo, instruções e link; HTML escapado", () => {
  const { subject, html } = montarAvisoAoCliente({
    aviso: { tipo: "pedido", itens: [{ nome: "Tradução <juramentada>", instrucoes: "Para o inglês & com carimbo", prazo: "2026-10-24" }] },
    clienteNome: "Ana Maria Souza",
    idioma: "pt",
    link,
  });
  assert.match(subject, /pediu/);
  assert.match(html, /Olá, Ana\./);
  assert.match(html, /Tradução &lt;juramentada&gt;/);
  assert.match(html, /até 24\/10\/2026/);
  assert.match(html, /&amp; com carimbo/);
  assert.ok(html.includes(link));
});

test("recusa em inglês leva o motivo", () => {
  const { subject, html } = montarAvisoAoCliente({
    aviso: { tipo: "recusa", documento: "Bank statement", motivo: "Missing August" },
    clienteNome: "John",
    idioma: "en",
    link,
  });
  assert.match(subject, /upload again: Bank statement/);
  assert.match(html, /Reason: Missing August/);
});

test("formulário reaberto pede novo envio", () => {
  const { html } = montarAvisoAoCliente({ aviso: { tipo: "formulario", motivo: "Endereço mudou" }, clienteNome: "Ana", idioma: "pt", link });
  assert.match(html, /reabriu o formulário/);
  assert.match(html, /Endereço mudou/);
});
