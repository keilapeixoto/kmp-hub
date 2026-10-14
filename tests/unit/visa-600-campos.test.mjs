import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const campos = JSON.parse(readFileSync(new URL("../../scripts/visa-600-new-fields.json", import.meta.url), "utf8"));
const extensao = readFileSync(new URL("../../browser-extension/visa-autofill.js", import.meta.url), "utf8");
const ETAPAS = [
  "Dados Pessoais", "Passaporte", "Contato e Endereço", "Família", "Detalhes da Viagem",
  "Trabalho e Finanças", "Histórico de Viagens", "Saúde e Caráter", "Declaração e Assinatura",
];

test("são 35 perguntas novas, todas opcionais, com etapa e tipo válidos", () => {
  assert.equal(campos.length, 35);
  for (const c of campos) {
    assert.ok(ETAPAS.includes(c.etapa), `etapa inválida: ${c.etapa}`);
    assert.ok(["text", "textarea", "select", "radio", "date"].includes(c.tipo), c.label);
    assert.equal(c.obrigatorio, false, `${c.label} deveria ser opcional`);
    if (c.tipo === "radio") assert.deepEqual(c.opcoes, ["Sim", "Não"], c.label);
    if (c.tipo === "select") assert.ok(c.opcoes.length >= 2, c.label);
  }
});

test("rótulos únicos", () => {
  assert.equal(new Set(campos.map((c) => c.label)).size, campos.length);
});

test("todo campo novo tem entrada no FIELD_MAP da extensão (pelo mesmo rótulo)", () => {
  for (const c of campos) {
    assert.ok(extensao.includes(JSON.stringify(c.label)), `sem mapeamento: ${c.label}`);
  }
});
