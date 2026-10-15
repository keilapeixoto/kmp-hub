import test from "node:test";
import assert from "node:assert/strict";
import { itensPendentesDoCliente, percentualPreenchido, linkWhatsapp } from "../../lib/portal/progresso.ts";

test("pendentes do cliente: só o que depende dele", () => {
  const itens = [
    { id: "1", status: "solicitado" },
    { id: "2", status: "enviado" },
    { id: "3", status: "rejeitado" },
    { id: "4", status: "aprovado" },
    { id: "5", status: "reenvio_solicitado" },
    { id: "6", status: "nao_solicitado" },
  ];
  assert.deepEqual(itensPendentesDoCliente(itens).map((i) => i.id), ["1", "3", "5"]);
});

test("percentual conta só campos do formulário com resposta não vazia", () => {
  const campos = ["a", "b", "c", "d"];
  const respostas = [
    { field_id: "a", valor: "x" },
    { field_id: "b", valor: "  " },
    { field_id: "c", valor: null },
    { field_id: "z", valor: "fora do formulário" },
  ];
  assert.equal(percentualPreenchido(campos, respostas), 25);
  assert.equal(percentualPreenchido([], respostas), 0);
});

test("WhatsApp: só dígitos; telefone curto ou vazio não vira link", () => {
  assert.equal(linkWhatsapp("+61 (4) 1234-5678"), "https://wa.me/61412345678");
  assert.equal(linkWhatsapp("123"), null);
  assert.equal(linkWhatsapp(null), null);
});

test("envio pelo portal: pedido vira Enviado, recusado vira Reenviado, resto não muda", async () => {
  const { statusDepoisDoEnvio } = await import("../../lib/portal/progresso.ts");
  assert.equal(statusDepoisDoEnvio("solicitado"), "enviado");
  assert.equal(statusDepoisDoEnvio("aguardando_cliente"), "enviado");
  assert.equal(statusDepoisDoEnvio("rejeitado"), "reenviado");
  assert.equal(statusDepoisDoEnvio("reenvio_solicitado"), "reenviado");
  assert.equal(statusDepoisDoEnvio("em_analise"), null);
  assert.equal(statusDepoisDoEnvio("aprovado"), null);
});
