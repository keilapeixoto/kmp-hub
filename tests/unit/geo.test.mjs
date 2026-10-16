import test from "node:test";
import assert from "node:assert/strict";
import { codigoDoPais, enderecoEmTexto, lerEndereco, listaDeFusos, listaDePaises, ESTADOS } from "../../lib/geo.ts";

test("países em português com Brasil e Austrália no topo", () => {
  const p = listaDePaises();
  assert.deepEqual(p.slice(0, 2).map((x) => x.nome), ["Brasil", "Austrália"]);
  assert.ok(p.length > 200);
  assert.ok(p.some((x) => x.nome === "Estados Unidos"));
});

test("código do país aceita português, inglês e maiúsculas", () => {
  assert.equal(codigoDoPais("Brasil"), "BR");
  assert.equal(codigoDoPais("BRAZIL"), "BR");
  assert.equal(codigoDoPais("Austrália"), "AU");
  assert.equal(codigoDoPais("australia"), "AU");
  assert.equal(codigoDoPais("Brasileira"), null);
});

test("estados da Austrália e do Brasil", () => {
  assert.equal(ESTADOS.AU.length, 8);
  assert.equal(ESTADOS.BR.length, 27);
  assert.ok(ESTADOS.AU.some((e) => e.sigla === "NSW"));
});

test("fusos do mundo com deslocamento", () => {
  const f = listaDeFusos(new Date("2026-07-01T00:00:00Z"));
  assert.ok(f.length > 300);
  assert.match(f.find((x) => x.id === "America/Sao_Paulo").rotulo, /GMT-3/);
  assert.match(f.find((x) => x.id === "Australia/Sydney").rotulo, /GMT\+10/);
});

test("endereço: JSON, texto antigo e linha legível", () => {
  const e = lerEndereco(JSON.stringify({ pais: "Brasil", estado: "SP", cidade: "Campinas", rua: "Rua A", numero: "10" }));
  assert.equal(e.estado, "SP");
  assert.equal(enderecoEmTexto(e), "Rua A, 10 — Campinas/SP — Brasil");
  assert.equal(lerEndereco("Rua velha 1", "Brasil").rua, "Rua velha 1");
  assert.equal(lerEndereco(null, "Austrália").pais, "Austrália");
});
